import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import { getApp, getEmailQueue, getRedis, getUserModel } from "../helpers/app";
import {
  bodyText,
  createUser,
  expiredToken,
  issueEmailVerificationToken,
  issueResetToken,
  lastQueuedJob,
  loginAndGetToken,
  SECRETS,
  sha256,
  signAuthToken,
  signResetToken,
  setCookieHeaders,
} from "../helpers/factories";
import { RATE_LIMIT_PREFIX, resetRateLimitStore } from "../helpers/inMemoryRateLimitStore";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});

const NEW_PASSWORD = "NewPassw0rd@2";

const forgot = (body?: unknown) => {
  const req = request(app).post("/api/auth/forgot-password");
  return body === undefined ? req : req.send(body as object);
};

const reset = (body?: unknown) => {
  const req = request(app).post("/api/auth/reset-password");
  return body === undefined ? req : req.send(body as object);
};

describe("POST /api/auth/forgot-password", () => {
  describe("success", () => {
    it("answers 200 and queues a password-reset e-mail", async () => {
      const user = await createUser();

      const res = await forgot({ email: user.email });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        statusCode: 200,
        message: "password reset link sent successfully",
        data: null,
      });
      const job = await lastQueuedJob();
      expect(job!.name).toBe("password-reset-email");
      expect(job!.data).toMatchObject({ email: user.email, username: user.username });
      expect(job!.opts).toEqual({ attempts: 3, backoff: { type: "exponential", delay: 5000 } });
    });

    it("builds the reset URL from FRONTEND_URL and a JWT signed with RESET_PASSWORD_SECRET_KEY", async () => {
      const user = await createUser();
      await forgot({ email: user.email });
      const { resetUrl } = (await lastQueuedJob())!.data;

      expect(resetUrl.startsWith("http://frontend.test/reset-password?token=")).toBe(true);
      const token = new URL(resetUrl).searchParams.get("token")!;
      const payload = jwt.verify(token, SECRETS.resetPassword) as jwt.JwtPayload;
      expect(payload.id).toBe(user.id);
      expect(payload.exp! - payload.iat!).toBe(300);
      expect(() => jwt.verify(token, SECRETS.jwt)).toThrow();
    });

    it("stores only the token's SHA-256 hash in Redis with a 5 minute TTL", async () => {
      const user = await createUser();
      await forgot({ email: user.email });
      const token = new URL((await lastQueuedJob())!.data.resetUrl).searchParams.get("token")!;
      const redis = await getRedis();
      const key = `password-reset:user:${user.id}`;

      expect(await redis.get(key)).toBe(sha256(token));
      expect(await redis.ttl(key)).toBeGreaterThan(290);
      expect(await redis.ttl(key)).toBeLessThanOrEqual(300);
    });

    it("normalises the e-mail address", async () => {
      const user = await createUser({ email: "forgot.me@example.com" });
      const res = await forgot({ email: "  Forgot.ME@Example.com " });
      expect(res.status).toBe(200);
    });

    it("does not change the password until the link is used", async () => {
      const user = await createUser();
      await forgot({ email: user.email });

      const token = await loginAndGetToken(app, user.email, user.password);
      expect(token).toBeTruthy();
    });

    it("does not return the token or reset URL in the HTTP response", async () => {
      const user = await createUser();
      const res = await forgot({ email: user.email });

      const { resetUrl } = (await lastQueuedJob())!.data;
      const token = new URL(resetUrl).searchParams.get("token")!;
      expect(bodyText(res)).not.toContain(token);
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("[FINDING] also works for unverified accounts", async () => {
      const user = await createUser({ emailVerified: false });
      const res = await forgot({ email: user.email });
      expect(res.status).toBe(200);
    });
  });

  describe("validation and errors", () => {
    it("rejects a missing body, empty and malformed e-mails with 400", async () => {
      expect((await forgot()).status).toBe(400);
      expect((await forgot({ email: "" })).status).toBe(400);
      expect((await forgot({ email: "nope" })).status).toBe(400);
    });

    it.each([
      ["null", null],
      ["a number", 12],
      ["an array", ["a@example.com"]],
      ["a NoSQL operator", { $ne: "" }],
    ])("rejects %s as the e-mail", async (_l, email) => {
      expect((await forgot({ email })).status).toBe(400);
    });

    it("answers 404 for an unknown e-mail and sends nothing", async () => {
      const res = await forgot({ email: "ghost@example.com" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("user not found");
      expect(await lastQueuedJob()).toBeUndefined();
    });

    it("[FINDING] account enumeration: unknown e-mail (404) vs known e-mail (200)", async () => {
      const user = await createUser();

      const known = await forgot({ email: user.email });
      const unknown = await forgot({ email: "ghost@example.com" });

      expect(known.status).toBe(200);
      expect(unknown.status).toBe(404);
    });

    it("answers 500 when Redis is down and sends no e-mail", async () => {
      const user = await createUser();
      (await getRedis()).set.mockRejectedValueOnce(new Error("redis down"));

      const res = await forgot({ email: user.email });

      expect(res.status).toBe(500);
      expect(await lastQueuedJob()).toBeUndefined();
    });

    it("answers 500 when the e-mail queue is down", async () => {
      const user = await createUser();
      (await getEmailQueue()).add.mockRejectedValueOnce(new Error("queue unavailable"));

      const res = await forgot({ email: user.email });

      expect(res.status).toBe(500);
    });
  });

  describe("rate limiting", () => {
    it("allows 3 requests per IP then answers 429", async () => {
      const user = await createUser();
      for (let i = 0; i < 3; i++) {
        expect((await forgot({ email: user.email })).status).toBe(200);
      }
      expect((await forgot({ email: user.email })).status).toBe(429);
    });

    it("limits a single e-mail address to 3 requests regardless of IP", async () => {
      const user = await createUser();
      for (let i = 0; i < 3; i++) {
        await forgot({ email: user.email });
        resetRateLimitStore(RATE_LIMIT_PREFIX.resendEmailIp);
      }
      const res = await forgot({ email: user.email });

      expect(res.status).toBe(429);
      expect(res.body.message).toBe("too many requests, please try again later");
    });
  });
});

/* ========================================================================== */

describe("POST /api/auth/reset-password", () => {
  describe("success", () => {
    it("resets the password, answers 200 and returns the user without secrets", async () => {
      const user = await createUser();
      const token = await issueResetToken(user.id);

      const res = await reset({ token, password: NEW_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, statusCode: 200, message: "Password reset successfully" });
      expect(res.body.data).toMatchObject({ _id: user.id, email: user.email });
      expect(res.body.data).not.toHaveProperty("password");
      expect(bodyText(res)).not.toContain("$2");
      expect(bodyText(res)).not.toContain(NEW_PASSWORD);
    });

    it("stores the new password as a bcrypt hash", async () => {
      const user = await createUser();
      await reset({ token: await issueResetToken(user.id), password: NEW_PASSWORD });

      const User = await getUserModel();
      const stored = await User.findById(user.id).select("+password");
      expect(stored!.password).toMatch(/^\$2[aby]\$/);
      expect(stored!.password).not.toBe(NEW_PASSWORD);
      await expect(stored!.comparePassword(NEW_PASSWORD)).resolves.toBe(true);
    });

    it("allows logging in with the new password and rejects the old one", async () => {
      const user = await createUser();
      await reset({ token: await issueResetToken(user.id), password: NEW_PASSWORD });

      const withNew = await request(app).post("/api/auth/login").send({ email: user.email, password: NEW_PASSWORD });
      const withOld = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password });

      expect(withNew.status).toBe(200);
      expect(withOld.status).toBe(401);
    });

    it("consumes the token: it cannot be used a second time", async () => {
      const user = await createUser();
      const token = await issueResetToken(user.id);

      expect((await reset({ token, password: NEW_PASSWORD })).status).toBe(200);
      const second = await reset({ token, password: "Another@Pass9" });

      expect(second.status).toBe(400);
      expect(await (await getRedis()).get(`password-reset:user:${user.id}`)).toBeNull();
      // and the second password was NOT applied
      const login = await request(app).post("/api/auth/login").send({ email: user.email, password: NEW_PASSWORD });
      expect(login.status).toBe(200);
    });

    it("end-to-end: forgot-password -> reset with the e-mailed token -> login", async () => {
      const user = await createUser();
      await forgot({ email: user.email });
      const token = new URL((await lastQueuedJob())!.data.resetUrl).searchParams.get("token")!;

      expect((await reset({ token, password: NEW_PASSWORD })).status).toBe(200);
      expect(await loginAndGetToken(app, user.email, NEW_PASSWORD)).toBeTruthy();
    });

    it("trims whitespace around the token", async () => {
      const user = await createUser();
      const token = await issueResetToken(user.id);

      const res = await reset({ token: `  ${token}  `, password: NEW_PASSWORD });

      expect(res.status).toBe(200);
    });

    it("a newer reset link invalidates the older one", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await createUser();
      const oldToken = await issueResetToken(user.id);
      vi.setSystemTime(new Date(Date.now() + 2000));
      const newToken = await issueResetToken(user.id);

      expect((await reset({ token: oldToken, password: NEW_PASSWORD })).status).toBe(400);
      expect((await reset({ token: newToken, password: NEW_PASSWORD })).status).toBe(200);
    });

    it("does not log the user in (no cookie)", async () => {
      const user = await createUser();
      const res = await reset({ token: await issueResetToken(user.id), password: NEW_PASSWORD });
      expect(setCookieHeaders(res)).toHaveLength(0);
    });
  });

  describe("token problems", () => {
    it("rejects a missing token (400 from validation)", async () => {
      const res = await reset({ password: NEW_PASSWORD });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("token is required");
    });

    it("rejects an empty / whitespace token", async () => {
      expect((await reset({ token: "", password: NEW_PASSWORD })).status).toBe(400);
      expect((await reset({ token: "    ", password: NEW_PASSWORD })).status).toBe(400);
    });

    it.each(["garbage", "a.b.c", "eyJhbGciOiJIUzI1NiJ9.e30.bad"])("rejects malformed token %j with 400", async (token) => {
      const res = await reset({ token, password: NEW_PASSWORD });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid reset token");
    });

    it("rejects an expired token with 400 'expired reset token'", async () => {
      const user = await createUser();
      const token = expiredToken(user.id, SECRETS.resetPassword);

      const res = await reset({ token, password: NEW_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("expired reset token");
    });

    it("rejects a token signed with the wrong secret", async () => {
      const user = await createUser();
      const forged = jwt.sign({ id: user.id }, "attacker-secret", { expiresIn: "5m" });
      await (await getRedis()).set(`password-reset:user:${user.id}`, sha256(forged), "EX", 300);

      const res = await reset({ token: forged, password: NEW_PASSWORD });

      expect(res.status).toBe(400);
    });

    it("rejects a login JWT and an e-mail-verification JWT (separate secrets)", async () => {
      const user = await createUser();
      expect((await reset({ token: signAuthToken(user.id), password: NEW_PASSWORD })).status).toBe(400);
      expect(
        (await reset({ token: await issueEmailVerificationToken(user.id), password: NEW_PASSWORD })).status,
      ).toBe(400);
    });

    it("rejects an alg=none token", async () => {
      const user = await createUser();
      const none = [
        Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
        Buffer.from(JSON.stringify({ id: user.id })).toString("base64url"),
        "",
      ].join(".");

      const res = await reset({ token: none, password: NEW_PASSWORD });

      expect(res.status).toBe(400);
    });

    it("rejects a signed token without an id", async () => {
      const token = jwt.sign({ foo: 1 }, SECRETS.resetPassword, { expiresIn: "5m" });
      const res = await reset({ token, password: NEW_PASSWORD });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid reset token");
    });

    it("rejects a valid JWT that was never issued (no hash in Redis)", async () => {
      const user = await createUser();
      const res = await reset({ token: signResetToken(user.id), password: NEW_PASSWORD });

      expect(res.status).toBe(400);
      const User = await getUserModel();
      const stored = await User.findById(user.id).select("+password");
      await expect(stored!.comparePassword(user.password)).resolves.toBe(true);
    });

    it("rejects a token whose Redis entry has expired", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await createUser();
      const token = await issueResetToken(user.id);

      vi.setSystemTime(new Date(Date.now() + 5 * 60 * 1000 + 1000));
      const res = await reset({ token, password: NEW_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("expired reset token");
    });

    it("answers 404 when the user was deleted after the token was issued", async () => {
      const user = await createUser();
      const token = await issueResetToken(user.id);
      await (await getUserModel()).deleteOne({ _id: user.id });

      const res = await reset({ token, password: NEW_PASSWORD });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("user not found");
    });

    it("a token for user A cannot reset user B's password", async () => {
      const a = await createUser();
      const b = await createUser();
      const tokenForA = await issueResetToken(a.id);

      await reset({ token: tokenForA, password: NEW_PASSWORD });

      const User = await getUserModel();
      const storedB = await User.findById(b.id).select("+password");
      await expect(storedB!.comparePassword(b.password)).resolves.toBe(true);
    });
  });

  describe("password rules (Zod boundaries)", () => {
    const attempt = async (password: unknown) => {
      const user = await createUser();
      return reset({ token: await issueResetToken(user.id), password });
    };

    it("rejects a missing password", async () => {
      const user = await createUser();
      const res = await reset({ token: await issueResetToken(user.id) });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("password is required");
    });

    it("rejects 5 characters / accepts 6 / accepts 32 / rejects 33", async () => {
      expect((await attempt("Aa1@x")).status).toBe(400);
      expect((await attempt("Aa1@xy")).status).toBe(200);
      expect((await attempt(`Aa1@${"x".repeat(28)}`)).status).toBe(200);
      expect((await attempt(`Aa1@${"x".repeat(29)}`)).status).toBe(400);
    });

    it.each([
      ["no uppercase", "passw0rd@1"],
      ["no lowercase", "PASSW0RD@1"],
      ["no digit", "Password@@"],
      ["no special char", "Passw0rd11"],
      ["disallowed special char", "Passw0rd#1"],
      ["a space", "Passw0rd @1"],
      ["non-ASCII", "Pässw0rd@1"],
    ])("rejects a password with %s", async (_l, password) => {
      expect((await attempt(password)).status).toBe(400);
    });

    it.each([
      ["null", null],
      ["a number", 12345678],
      ["an array", [NEW_PASSWORD]],
      ["an object", { $ne: "" }],
    ])("rejects %s as the password", async (_l, password) => {
      expect((await attempt(password)).status).toBe(400);
    });

    it("does not consume the token when the new password is invalid", async () => {
      const user = await createUser();
      const token = await issueResetToken(user.id);

      expect((await reset({ token, password: "weak" })).status).toBe(400);
      expect((await reset({ token, password: NEW_PASSWORD })).status).toBe(200);
    });

    it.each([
      ["null", null],
      ["a number", 123],
      ["an array", ["x"]],
      ["an object", { $ne: null }],
    ])("rejects %s as the token (NoSQL / type guard)", async (_l, token) => {
      const res = await reset({ token, password: NEW_PASSWORD });
      expect(res.status).toBe(400);
    });
  });

  describe("security behaviour", () => {
    it("repeated / concurrent use of one token never leaves the account in an inconsistent state", async () => {
      const user = await createUser();
      const token = await issueResetToken(user.id);

      const results = await Promise.all([
        reset({ token, password: "FirstPass@1a" }),
        reset({ token, password: "SecondPass@2b" }),
      ]);

      const statuses = results.map((r) => r.status);
      expect(statuses.every((s) => s === 200 || s === 400)).toBe(true);
      expect(statuses).toContain(200);
      // The token is gone afterwards:
      expect((await reset({ token, password: "ThirdPass@3c" })).status).toBe(400);
    });

    it("[FINDING] existing sessions (JWT cookies) stay valid after a password reset", async () => {
      const user = await createUser();
      const sessionToken = await loginAndGetToken(app, user.email, user.password);

      await reset({ token: await issueResetToken(user.id), password: NEW_PASSWORD });

      const me = await request(app).get("/api/auth/me").set("Cookie", `token=${sessionToken}`);
      expect(me.status).toBe(200);
    });

    it("[FINDING] resetting the password does not verify an unverified account", async () => {
      const user = await createUser({ emailVerified: false });
      await reset({ token: await issueResetToken(user.id), password: NEW_PASSWORD });

      const login = await request(app).post("/api/auth/login").send({ email: user.email, password: NEW_PASSWORD });
      expect(login.status).toBe(403);
    });
  });

  describe("failures", () => {
    it("answers 500 when Redis is down (fails closed, password unchanged)", async () => {
      const user = await createUser();
      const token = await issueResetToken(user.id);
      (await getRedis()).get.mockRejectedValueOnce(new Error("redis down"));

      const res = await reset({ token, password: NEW_PASSWORD });

      expect(res.status).toBe(500);
      const stored = await (await getUserModel()).findById(user.id).select("+password");
      await expect(stored!.comparePassword(user.password)).resolves.toBe(true);
    });

    it("answers 500 when saving the user fails and keeps the token usable", async () => {
      const user = await createUser();
      const token = await issueResetToken(user.id);
      const User = await getUserModel();
      vi.spyOn(User.prototype, "save").mockRejectedValueOnce(new Error("mongo down"));

      const res = await reset({ token, password: NEW_PASSWORD });

      expect(res.status).toBe(500);
      expect(await (await getRedis()).get(`password-reset:user:${user.id}`)).toBe(sha256(token));
    });
  });

  describe("rate limiting", () => {
    it("allows 5 attempts per IP then answers 429", async () => {
      for (let i = 0; i < 5; i++) {
        expect((await reset({ token: "garbage", password: NEW_PASSWORD })).status).toBe(400);
      }
      const res = await reset({ token: "garbage", password: NEW_PASSWORD });

      expect(res.status).toBe(429);
      expect(res.body.message).toBe("too many request , please try again later");
    });

    it("blocks even a correct token once the limit is reached", async () => {
      const user = await createUser();
      const token = await issueResetToken(user.id);
      for (let i = 0; i < 5; i++) await reset({ token: "garbage", password: NEW_PASSWORD });

      const res = await reset({ token, password: NEW_PASSWORD });

      expect(res.status).toBe(429);
    });
  });
});
