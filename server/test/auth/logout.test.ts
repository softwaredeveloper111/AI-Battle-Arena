import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { getApp, getRedis } from "../helpers/app";
import {
  authCookie,
  cookieAttributes,
  createUser,
  expiredToken,
  findSetCookie,
  loginAndGetToken,
  SECRETS,
  sha256,
  signAuthToken,
  setCookieHeaders,
} from "../helpers/factories";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});

const logout = (cookie?: string) => {
  const req = request(app).post("/api/auth/logout");
  return cookie === undefined ? req : req.set("Cookie", cookie);
};
const me = (cookie: string) => request(app).get("/api/auth/me").set("Cookie", cookie);

describe("POST /api/auth/logout", () => {
  describe("success", () => {
    it("answers 200 for a logged-in user", async () => {
      const user = await createUser();
      const token = await loginAndGetToken(app, user.email, user.password);

      const res = await logout(authCookie(token));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, statusCode: 200, message: "user logout successfully", data: null });
    });

    it("clears the token cookie (empty value, expired in the past, same path)", async () => {
      const user = await createUser();
      const token = await loginAndGetToken(app, user.email, user.password);

      const res = await logout(authCookie(token));
      const cookie = findSetCookie(res, "token")!;
      const attrs = cookieAttributes(cookie);

      expect(cookie.startsWith("token=;")).toBe(true);
      expect(attrs).toContain("Path=/");
      expect(attrs).toContain("HttpOnly");
      expect(attrs.find((a) => a.startsWith("Expires="))).toMatch(/1970/);
    });

    it("blacklists the SHA-256 hash of the token (never the raw token) for its remaining lifetime", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const redis = await getRedis();

      await logout(authCookie(token));

      const key = `blacklist:token:${sha256(token)}`;
      expect(await redis.get(key)).toBe("1");
      expect(await redis.get(`blacklist:token:${token}`)).toBeNull();
      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(24 * 3600 - 10);
      expect(ttl).toBeLessThanOrEqual(24 * 3600);
    });

    it("uses the REMAINING lifetime as the blacklist TTL", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id, { expiresIn: "10m" });
      const redis = await getRedis();

      await logout(authCookie(token));

      const ttl = await redis.ttl(`blacklist:token:${sha256(token)}`);
      expect(ttl).toBeGreaterThan(590);
      expect(ttl).toBeLessThanOrEqual(600);
    });

    it("invalidates the cached profile of the user", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const redis = await getRedis();
      await me(authCookie(token)); // populate cache
      expect(await redis.get(`user:profile:${user.id}`)).not.toBeNull();

      await logout(authCookie(token));

      expect(await redis.get(`user:profile:${user.id}`)).toBeNull();
    });
  });

  describe("token reuse", () => {
    it("rejects the same token on /me after logout (blacklisted)", async () => {
      const user = await createUser();
      const token = await loginAndGetToken(app, user.email, user.password);
      expect((await me(authCookie(token))).status).toBe(200);

      await logout(authCookie(token));
      const res = await me(authCookie(token));

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("unthorized access!! invalid token !! blacklisted token");
    });

    it("rejects the same token on a second logout", async () => {
      const user = await createUser();
      const token = await loginAndGetToken(app, user.email, user.password);

      expect((await logout(authCookie(token))).status).toBe(200);
      const second = await logout(authCookie(token));

      expect(second.status).toBe(401);
      expect(setCookieHeaders(second)).toHaveLength(0);
    });

    it("lets the user log in again after logging out and receive a working session", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await createUser();
      const first = await loginAndGetToken(app, user.email, user.password);
      await logout(authCookie(first));

      vi.setSystemTime(new Date(Date.now() + 2000));
      const second = await loginAndGetToken(app, user.email, user.password);

      expect(second).not.toBe(first);
      expect((await me(authCookie(second))).status).toBe(200);
      expect((await me(authCookie(first))).status).toBe(401);
    });

    it("only revokes the presented token - other devices keep their session", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await createUser();
      const deviceA = signAuthToken(user.id);
      vi.setSystemTime(new Date(Date.now() + 2000));
      const deviceB = signAuthToken(user.id);

      await logout(authCookie(deviceA));

      expect((await me(authCookie(deviceA))).status).toBe(401);
      expect((await me(authCookie(deviceB))).status).toBe(200);
    });
  });

  describe("missing / invalid authentication", () => {
    it("answers 401 without a cookie and blacklists nothing", async () => {
      const res = await logout();

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("unthorized access !! token not found");
      expect((await getRedis()).__keys().filter((k: string) => k.startsWith("blacklist:"))).toHaveLength(0);
    });

    it.each(["garbage", "a.b.c", "Bearer abc"])("answers 401 for the malformed token %j", async (token) => {
      const res = await logout(`token=${token}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid or expired token");
    });

    it("answers 401 for a token with an invalid signature", async () => {
      const user = await createUser();
      const jwt = (await import("jsonwebtoken")).default;
      const forged = jwt.sign({ id: user.id }, "attacker-secret", { expiresIn: "1d" });

      const res = await logout(authCookie(forged));

      expect(res.status).toBe(401);
    });

    it("answers 401 for an expired token", async () => {
      const user = await createUser();
      const res = await logout(authCookie(expiredToken(user.id, SECRETS.jwt)));
      expect(res.status).toBe(401);
    });

    it("answers 404 when the account was deleted", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const { getUserModel } = await import("../helpers/app");
      await (await getUserModel()).deleteOne({ _id: user.id });

      const res = await logout(authCookie(token));

      expect(res.status).toBe(404);
    });

    it("does not accept the token via the Authorization header", async () => {
      const user = await createUser();
      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${signAuthToken(user.id)}`);

      expect(res.status).toBe(401);
    });
  });

  describe("infrastructure failures", () => {
    it("answers 500 when Redis cannot store the blacklist entry (cookie is NOT cleared)", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const redis = await getRedis();
      redis.set.mockImplementation(async (key: string) => {
        if (key.startsWith("blacklist:")) throw new Error("redis down");
        return "OK";
      });

      const res = await logout(authCookie(token));

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("[FINDING] when Redis is down the token is not revoked, so it keeps working after the failed logout", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      const redis = await getRedis();
      const original = redis.set.getMockImplementation();
      redis.set.mockImplementation(async (key: string, ...rest: unknown[]) => {
        if (key.startsWith("blacklist:")) throw new Error("redis down");
        return original(key, ...rest);
      });

      const failed = await logout(authCookie(token));
      expect(failed.status).toBe(500);

      redis.set.mockImplementation(original);
      expect((await me(authCookie(token))).status).toBe(200);
    });

    it("answers 500 when Redis is down for the blacklist lookup (auth middleware fails closed)", async () => {
      const user = await createUser();
      (await getRedis()).get.mockRejectedValueOnce(new Error("redis down"));

      const res = await logout(authCookie(signAuthToken(user.id)));

      expect(res.status).toBe(500);
    });
  });

  describe("methods and rate limit", () => {
    it.each(["get", "put", "delete", "patch"] as const)("does not expose logout via %s", async (method) => {
      const user = await createUser();
      const res = await (request(app) as any)[method]("/api/auth/logout").set("Cookie", authCookie(signAuthToken(user.id)));
      expect(res.status).toBe(404);
    });

    it("is covered by the global rate limiter (300 / 15 min)", async () => {
      const res = await logout();
      expect(Object.keys(res.headers).join(",").toLowerCase()).toMatch(/ratelimit/);
    });
  });
});
