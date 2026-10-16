import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import { getApp, getRedis, getUserModel } from "../helpers/app";
import {
  authCookie,
  bodyText,
  createUser,
  expiredToken,
  loginAndGetToken,
  SECRETS,
  sha256,
  signAuthToken,
  signEmailToken,
  signResetToken,
} from "../helpers/factories";
import { RATE_LIMIT_PREFIX, resetRateLimitStore } from "../helpers/inMemoryRateLimitStore";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});

const me = (cookie?: string) => {
  const req = request(app).get("/api/auth/me");
  return cookie === undefined ? req : req.set("Cookie", cookie);
};

describe("GET /api/auth/me", () => {
  describe("authenticated", () => {
    it("returns the current user", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);

      const res = await me(authCookie(token));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, statusCode: 200, message: "user get successfully" });
      expect(res.body.data).toMatchObject({
        _id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: true,
      });
    });

    it("works after a real login round-trip", async () => {
      const user = await createUser();
      const token = await loginAndGetToken(app, user.email, user.password);

      const res = await me(authCookie(token));

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(user.email);
    });

    it("never exposes the password / hash", async () => {
      const user = await createUser();

      const first = await me(authCookie(signAuthToken(user.id))); // cache miss
      const second = await me(authCookie(signAuthToken(user.id))); // cache hit

      for (const res of [first, second]) {
        expect(res.body.data).not.toHaveProperty("password");
        expect(bodyText(res)).not.toContain("$2");
        expect(bodyText(res)).not.toContain(user.password);
      }
    });

    it("[FINDING] leaks the internal Mongoose __v field (lean() bypasses the model's toJSON cleanup)", async () => {
      const user = await createUser();
      const res = await me(authCookie(signAuthToken(user.id)));
      expect(res.body.data).toHaveProperty("__v");
    });

    it("caches the profile in Redis for 5 minutes and serves the second call from the cache", async () => {
      const user = await createUser();
      const redis = await getRedis();
      const cacheKey = `user:profile:${user.id}`;

      await me(authCookie(signAuthToken(user.id)));
      expect(await redis.get(cacheKey)).not.toBeNull();
      expect(await redis.ttl(cacheKey)).toBeGreaterThan(290);

      const User = await getUserModel();
      const spy = vi.spyOn(User, "findById");
      const second = await me(authCookie(signAuthToken(user.id)));

      expect(second.status).toBe(200);
      expect(spy).not.toHaveBeenCalled();
    });

    it("[FINDING] a deleted user stays authenticated for up to 5 minutes because of the profile cache", async () => {
      const user = await createUser();
      const cookie = authCookie(signAuthToken(user.id));
      expect((await me(cookie)).status).toBe(200); // warms the cache
      await (await getUserModel()).deleteOne({ _id: user.id });

      const res = await me(cookie);

      expect(res.status).toBe(200);
    });
  });

  describe("missing authentication", () => {
    it("answers 401 without a cookie", async () => {
      const res = await me();

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        success: false,
        statusCode: 401,
        message: "unthorized access !! token not found",
      });
    });

    it("answers 401 for an empty token cookie", async () => {
      expect((await me("token=")).status).toBe(401);
    });

    it("ignores the Authorization header (cookie is the only transport)", async () => {
      const user = await createUser();
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${signAuthToken(user.id)}`);

      expect(res.status).toBe(401);
    });

    it("ignores a token passed in the query string or body", async () => {
      const user = await createUser();
      const res = await request(app)
        .get(`/api/auth/me?token=${signAuthToken(user.id)}`)
        .send({ token: signAuthToken(user.id) });

      expect(res.status).toBe(401);
    });

    it("ignores a cookie with a different name", async () => {
      const user = await createUser();
      const res = await me(`jwt=${signAuthToken(user.id)}; session=${signAuthToken(user.id)}`);
      expect(res.status).toBe(401);
    });
  });

  describe("invalid tokens", () => {
    it.each(["garbage", "a.b.c", "Bearer abc", "eyJhbGciOiJIUzI1NiJ9.e30.sig", "....", "null", "undefined"])(
      "answers 401 for the malformed token %j",
      async (token) => {
        const res = await me(`token=${token}`);
        expect(res.status).toBe(401);
        expect(res.body.message).toBe("Invalid or expired token");
      },
    );

    it("answers 401 for a token with an invalid signature", async () => {
      const user = await createUser();
      const forged = jwt.sign({ id: user.id }, "attacker-secret", { expiresIn: "1d" });

      const res = await me(authCookie(forged));

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid or expired token");
    });

    it("answers 401 when the payload was tampered with after signing", async () => {
      const victim = await createUser();
      const attacker = await createUser();
      const [header, , signature] = signAuthToken(attacker.id).split(".");
      const payload = Buffer.from(JSON.stringify({ id: victim.id, exp: 9999999999 })).toString("base64url");

      const res = await me(authCookie(`${header}.${payload}.${signature}`));

      expect(res.status).toBe(401);
    });

    it("answers 401 for an alg=none token", async () => {
      const user = await createUser();
      const none = [
        Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
        Buffer.from(JSON.stringify({ id: user.id, exp: 9999999999 })).toString("base64url"),
        "",
      ].join(".");

      expect((await me(authCookie(none))).status).toBe(401);
    });

    it("[FINDING] jwt.verify does not pin the algorithm: an HS512 token signed with the right secret is accepted", async () => {
      const user = await createUser();
      const hs512 = jwt.sign({ id: user.id }, SECRETS.jwt, { algorithm: "HS512", expiresIn: "1d" });

      const res = await me(authCookie(hs512));

      expect(res.status).toBe(200);
    });

    it("answers 401 for an expired token", async () => {
      const user = await createUser();

      const res = await me(authCookie(expiredToken(user.id, SECRETS.jwt)));

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid or expired token");
    });

    it("answers 401 once a valid token passes its 1 day lifetime", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await createUser();
      const token = signAuthToken(user.id);

      vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000 + 5000));
      const res = await me(authCookie(token));

      expect(res.status).toBe(401);
    });

    it("answers 401 for a token without an id claim", async () => {
      const token = jwt.sign({ foo: "bar" }, SECRETS.jwt, { expiresIn: "1d" });
      const res = await me(authCookie(token));

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid token payload");
    });

    it("answers 401 for a token whose payload is a plain string", async () => {
      const token = jwt.sign("hello", SECRETS.jwt);
      expect((await me(authCookie(token))).status).toBe(401);
    });

    it("rejects tokens that belong to other flows (email verification / password reset)", async () => {
      const user = await createUser();

      expect((await me(authCookie(signEmailToken(user.id)))).status).toBe(401);
      expect((await me(authCookie(signResetToken(user.id)))).status).toBe(401);
    });

    it("answers 500 for a correctly signed token whose id is not a valid ObjectId", async () => {
      const res = await me(authCookie(signAuthToken("not-an-object-id")));
      expect(res.status).toBe(500);
    });
  });

  describe("blacklist", () => {
    it("answers 401 for a blacklisted token", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      await (await getRedis()).set(`blacklist:token:${sha256(token)}`, "1", "EX", 3600);

      const res = await me(authCookie(token));

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("unthorized access!! invalid token !! blacklisted token");
    });

    it("checks the blacklist before touching the database", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      await (await getRedis()).set(`blacklist:token:${sha256(token)}`, "1", "EX", 3600);
      const User = await getUserModel();
      const spy = vi.spyOn(User, "findById");

      await me(authCookie(token));

      expect(spy).not.toHaveBeenCalled();
    });

    it("blacklisting one token does not affect another valid token of the same user", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await createUser();
      const t1 = signAuthToken(user.id);
      vi.setSystemTime(new Date(Date.now() + 2000));
      const t2 = signAuthToken(user.id);
      expect(t1).not.toBe(t2);
      await (await getRedis()).set(`blacklist:token:${sha256(t1)}`, "1", "EX", 3600);

      expect((await me(authCookie(t1))).status).toBe(401);
      expect((await me(authCookie(t2))).status).toBe(200);
    });
  });

  describe("user state", () => {
    it("answers 404 when the user no longer exists", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      await (await getUserModel()).deleteOne({ _id: user.id });

      const res = await me(authCookie(token));

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("user not found");
    });

    it("negative-caches a missing user for 60 seconds", async () => {
      const user = await createUser();
      const token = signAuthToken(user.id);
      await (await getUserModel()).deleteOne({ _id: user.id });
      await me(authCookie(token));

      const redis = await getRedis();
      expect(await redis.get(`user:profile:${user.id}`)).toBe("null");
      expect(await redis.ttl(`user:profile:${user.id}`)).toBeLessThanOrEqual(60);

      const User = await getUserModel();
      const spy = vi.spyOn(User, "findById");
      expect((await me(authCookie(token))).status).toBe(404);
      expect(spy).not.toHaveBeenCalled();
    });

    it("[FINDING] the middleware does not check emailVerified - an unverified user holding a token is let in", async () => {
      const user = await createUser({ emailVerified: false });

      const res = await me(authCookie(signAuthToken(user.id)));

      expect(res.status).toBe(200);
      expect(res.body.data.emailVerified).toBe(false);
    });
  });

  describe("infrastructure failures", () => {
    it("answers 500 (fails closed) when Redis is down while checking the blacklist", async () => {
      const user = await createUser();
      const redis = await getRedis();
      redis.get.mockRejectedValueOnce(new Error("redis down"));

      const res = await me(authCookie(signAuthToken(user.id)));

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body).not.toHaveProperty("data");
    });

    it("answers 500 when MongoDB fails on a cache miss", async () => {
      const user = await createUser();
      const User = await getUserModel();
      vi.spyOn(User, "findById").mockImplementationOnce(() => {
        throw new Error("mongo down");
      });

      const res = await me(authCookie(signAuthToken(user.id)));

      expect(res.status).toBe(500);
    });

    it("answers 500 if the cached profile is corrupt JSON", async () => {
      const user = await createUser();
      const redis = await getRedis();
      await redis.set(`user:profile:${user.id}`, "{not-json", "EX", 300);

      const res = await me(authCookie(signAuthToken(user.id)));

      expect(res.status).toBe(500);
    });
  });

  describe("rate limiting", () => {
    it("answers 429 after 300 requests from one IP", async () => {
      const user = await createUser();
      const cookie = authCookie(signAuthToken(user.id));

      // warm the cache once, then hammer cheaply
      expect((await me(cookie)).status).toBe(200);
      resetRateLimitStore(RATE_LIMIT_PREFIX.global);
      for (let i = 0; i < 300; i++) {
        const res = await me(cookie);
        expect(res.status).toBe(200);
      }
      const blocked = await me(cookie);

      expect(blocked.status).toBe(429);
      expect(blocked.body.message).toBe("too many request , please try again later");
    }, 60_000);
  });
});
