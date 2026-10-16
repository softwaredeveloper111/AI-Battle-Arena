import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import { getApp, getRedis, getUserModel } from "../helpers/app";
import {
  createUser,
  expiredToken,
  issueEmailVerificationToken,
  issueResetToken,
  lastQueuedJob,
  loginAndGetToken,
  SECRETS,
  signAuthToken,
  signEmailToken,
  validRegistration,
  setCookieHeaders,
  sha256,
} from "../helpers/factories";
import { RATE_LIMIT_PREFIX, resetRateLimitStore } from "../helpers/inMemoryRateLimitStore";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});

const verify = (token?: unknown) => {
  const req = request(app).get("/api/auth/verify-link");
  return token === undefined ? req : req.query({ token: token as string });
};

const TEMPLATE = {
  invalid: "Invalid Verification Link",
  expired: "Verification Link Expired",
  already: "Email Already Verified",
  success: "Email Verified successfully",
};

describe("GET /api/auth/verify-link", () => {
  describe("valid token", () => {
    it("verifies the account, answers 200 with the success page and consumes the Redis token", async () => {
      const user = await createUser({ emailVerified: false });
      const token = await issueEmailVerificationToken(user.id);

      const res = await verify(token);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.text).toContain(TEMPLATE.success);

      const User = await getUserModel();
      expect((await User.findById(user.id))!.emailVerified).toBe(true);
      expect(await (await getRedis()).get(`email-verification:${user.id}`)).toBeNull();
    });

    it("does not log the user in (no cookie)", async () => {
      const user = await createUser({ emailVerified: false });
      const res = await verify(await issueEmailVerificationToken(user.id));

      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("end-to-end: register -> follow the e-mailed link -> login works", async () => {
      const payload = validRegistration();
      const reg = await request(app).post("/api/auth/register").send(payload);
      expect(reg.status).toBe(201);

      const before = await request(app).post("/api/auth/login").send({ email: payload.email, password: payload.password });
      expect(before.status).toBe(403);

      const job = await lastQueuedJob();
      const res = await verify(job!.data.verificationToken);
      expect(res.status).toBe(200);

      const token = await loginAndGetToken(app, payload.email, payload.password);
      expect(token).toBeTruthy();
    });

    it("does not change the user's password or other fields", async () => {
      const user = await createUser({ emailVerified: false });
      const User = await getUserModel();
      const before = await User.findById(user.id).select("+password");

      await verify(await issueEmailVerificationToken(user.id));

      const after = await User.findById(user.id).select("+password");
      expect(after!.password).toBe(before!.password);
      expect(after!.email).toBe(before!.email);
      expect(after!.username).toBe(before!.username);
    });
  });

  describe("missing / invalid token", () => {
    it("answers 400 with the invalid page when the token is missing", async () => {
      const res = await verify();
      expect(res.status).toBe(400);
      expect(res.text).toContain(TEMPLATE.invalid);
    });

    it("answers 400 with the invalid page when the token is empty", async () => {
      const res = await verify("");
      expect(res.status).toBe(400);
      expect(res.text).toContain(TEMPLATE.invalid);
    });

    it("answers 400 when the token is sent twice (array)", async () => {
      const res = await request(app).get("/api/auth/verify-link?token=a&token=b");
      expect(res.status).toBe(400);
      expect(res.text).toContain(TEMPLATE.invalid);
    });

    it("answers 400 when token is an object (token[a]=b)", async () => {
      const res = await request(app).get("/api/auth/verify-link?token[a]=b");
      expect(res.status).toBe(400);
    });

    it.each(["garbage", "a.b.c", "Bearer abc", "eyJhbGciOiJIUzI1NiJ9.e30.invalidsignature"])(
      "answers 401 with the invalid page for malformed token %j",
      async (token) => {
        const res = await verify(token);
        expect(res.status).toBe(401);
        expect(res.text).toContain(TEMPLATE.invalid);
      },
    );

    it("rejects a token signed with the wrong secret", async () => {
      const user = await createUser({ emailVerified: false });
      const forged = jwt.sign({ id: user.id }, "attacker-secret", { expiresIn: "5m" });
      await (await getRedis()).set(`email-verification:${user.id}`, sha256(forged), "EX", 300);

      const res = await verify(forged);

      expect(res.status).toBe(401);
      expect((await (await getUserModel()).findById(user.id))!.emailVerified).toBe(false);
    });

    it("rejects an unsigned (alg=none) token", async () => {
      const user = await createUser({ emailVerified: false });
      const none = [
        Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
        Buffer.from(JSON.stringify({ id: user.id })).toString("base64url"),
        "",
      ].join(".");

      const res = await verify(none);

      expect(res.status).toBe(401);
      expect((await (await getUserModel()).findById(user.id))!.emailVerified).toBe(false);
    });

    it("rejects a login JWT used as a verification token (secrets are separated)", async () => {
      const user = await createUser({ emailVerified: false });
      const res = await verify(signAuthToken(user.id));
      expect(res.status).toBe(401);
    });

    it("rejects a password-reset JWT used as a verification token", async () => {
      const user = await createUser({ emailVerified: false });
      const reset = await issueResetToken(user.id);
      const res = await verify(reset);
      expect(res.status).toBe(401);
    });

    it("rejects a validly signed token that carries no user id", async () => {
      const token = jwt.sign({ foo: "bar" }, SECRETS.emailVerification, { expiresIn: "5m" });
      const res = await verify(token);
      expect(res.status).toBe(401);
      expect(res.text).toContain(TEMPLATE.invalid);
    });

    it("rejects a token whose payload is a plain string", async () => {
      const token = jwt.sign("just-a-string", SECRETS.emailVerification);
      const res = await verify(token);
      expect(res.status).toBe(401);
    });
  });

  describe("expired token", () => {
    it("answers 401 with the 'expired' page", async () => {
      const user = await createUser({ emailVerified: false });
      const res = await verify(expiredToken(user.id, SECRETS.emailVerification));

      expect(res.status).toBe(401);
      expect(res.text).toContain(TEMPLATE.expired);
    });

    it("expires after 5 minutes in real time (token and Redis entry)", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await createUser({ emailVerified: false });
      const token = await issueEmailVerificationToken(user.id);

      vi.setSystemTime(new Date(Date.now() + 5 * 60 * 1000 + 1000));
      const res = await verify(token);

      expect(res.status).toBe(401);
      expect(res.text).toContain(TEMPLATE.expired);
    });

    it("rejects a still-valid JWT whose Redis entry has expired", async () => {
      const user = await createUser({ emailVerified: false });
      const token = signEmailToken(user.id); // JWT valid, nothing in Redis

      const res = await verify(token);

      expect(res.status).toBe(401);
      expect(res.text).toContain(TEMPLATE.invalid);
    });
  });

  describe("token state", () => {
    it("answers 403 'already verified' when the link is used a second time", async () => {
      const user = await createUser({ emailVerified: false });
      const token = await issueEmailVerificationToken(user.id);

      expect((await verify(token)).status).toBe(200);
      const second = await verify(token);

      expect(second.status).toBe(403);
      expect(second.text).toContain(TEMPLATE.already);
    });

    it("answers 403 for an account that was already verified before", async () => {
      const user = await createUser({ emailVerified: true });
      const token = await issueEmailVerificationToken(user.id);

      const res = await verify(token);

      expect(res.status).toBe(403);
      expect(res.text).toContain(TEMPLATE.already);
    });

    it("answers 404 when the user no longer exists", async () => {
      const user = await createUser({ emailVerified: false });
      const token = await issueEmailVerificationToken(user.id);
      await (await getUserModel()).deleteOne({ _id: user.id });

      const res = await verify(token);

      expect(res.status).toBe(404);
      expect(res.text).toContain(TEMPLATE.invalid);
    });

    it("answers 404 when a correctly signed token references an id that never existed", async () => {
      const res = await verify(signEmailToken("507f1f77bcf86cd799439011"));
      expect(res.status).toBe(404);
    });

    it("answers 500 for a signed token whose id is not a valid ObjectId (CastError)", async () => {
      const res = await verify(signEmailToken("not-an-object-id"));
      expect(res.status).toBe(500);
    });

    it("rejects a token that does not match the hash stored in Redis (another valid token for the same user)", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      const user = await createUser({ emailVerified: false });
      const oldToken = await issueEmailVerificationToken(user.id);

      vi.setSystemTime(new Date(Date.now() + 2000)); // new iat => different JWT string
      const newToken = await issueEmailVerificationToken(user.id);
      expect(newToken).not.toBe(oldToken);

      const old = await verify(oldToken);
      expect(old.status).toBe(401);
      const fresh = await verify(newToken);
      expect(fresh.status).toBe(200);
    });

    it("answers 500 if Redis is down (fails closed, user is not verified)", async () => {
      const user = await createUser({ emailVerified: false });
      const token = await issueEmailVerificationToken(user.id);
      (await getRedis()).get.mockRejectedValueOnce(new Error("redis down"));

      const res = await verify(token);

      expect(res.status).toBe(500);
      expect((await (await getUserModel()).findById(user.id))!.emailVerified).toBe(false);
    });
  });

  describe("rate limiting", () => {
    it("answers 429 on the 11th request within the window", async () => {
      for (let i = 0; i < 10; i++) {
        expect((await verify("garbage")).status).toBe(401);
      }
      const res = await verify("garbage");

      expect(res.status).toBe(429);
      expect(res.body.message).toBe("too many request , please try again later");
    });
  });
});

/* ============================================================================ */

const resend = (body?: unknown) => {
  const req = request(app).post("/api/auth/resend-verification-link");
  return body === undefined ? req : req.send(body as object);
};

describe("POST /api/auth/resend-verification-link", () => {
  it("queues a fresh verification e-mail for an unverified account", async () => {
    const user = await createUser({ emailVerified: false });

    const res = await resend({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      statusCode: 200,
      message: "email verification link sent successfully",
      data: null,
    });
    const job = await lastQueuedJob();
    expect(job!.name).toBe("verification-email");
    expect(job!.data).toMatchObject({ email: user.email, username: user.username });
    expect(job!.opts).toEqual({ attempts: 3, backoff: { type: "exponential", delay: 5000 } });
  });

  it("stores the new token's hash in Redis with a 5 minute TTL and the link then verifies the user", async () => {
    const user = await createUser({ emailVerified: false });
    await resend({ email: user.email });
    const job = await lastQueuedJob();
    const redis = await getRedis();

    expect(await redis.get(`email-verification:${user.id}`)).toBe(sha256(job!.data.verificationToken));
    expect(await redis.ttl(`email-verification:${user.id}`)).toBeGreaterThan(290);

    const res = await verify(job!.data.verificationToken);
    expect(res.status).toBe(200);
  });

  it("invalidates the previously e-mailed link", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const user = await createUser({ emailVerified: false });
    const oldToken = await issueEmailVerificationToken(user.id);

    vi.setSystemTime(new Date(Date.now() + 2000));
    await resend({ email: user.email });
    const newToken = (await lastQueuedJob())!.data.verificationToken;
    expect(newToken).not.toBe(oldToken);

    expect((await verify(oldToken)).status).toBe(401);
    expect((await verify(newToken)).status).toBe(200);
  });

  it("normalises the e-mail address", async () => {
    const user = await createUser({ emailVerified: false, email: "resend.me@example.com" });
    const res = await resend({ email: "  RESEND.Me@Example.com " });
    expect(res.status).toBe(200);
  });

  it("answers 400 for an already verified account and queues nothing", async () => {
    const user = await createUser({ emailVerified: true });

    const res = await resend({ email: user.email });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("user already verified");
    expect(await lastQueuedJob()).toBeUndefined();
  });

  it("answers 404 for an unknown e-mail", async () => {
    const res = await resend({ email: "ghost@example.com" });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("user not found");
    expect(await lastQueuedJob()).toBeUndefined();
  });

  it("[FINDING] account enumeration: 404 for unknown vs 200/400 for registered addresses", async () => {
    const unverified = await createUser({ emailVerified: false });
    const verified = await createUser({ emailVerified: true });

    const statuses = [
      (await resend({ email: "ghost@example.com" })).status,
      (await resend({ email: unverified.email })).status,
      (await resend({ email: verified.email })).status,
    ];

    expect(new Set(statuses).size).toBe(3);
  });

  it("rejects a missing body, an empty e-mail and malformed e-mails with 400", async () => {
    expect((await resend()).status).toBe(400);
    expect((await resend({ email: "" })).status).toBe(400);
    expect((await resend({ email: "nope" })).status).toBe(400);
  });

  it.each([
    ["null", null],
    ["a number", 7],
    ["an array", ["a@example.com"]],
    ["a NoSQL operator", { $ne: null }],
  ])("rejects %s as the e-mail", async (_l, email) => {
    const res = await resend({ email });
    expect(res.status).toBe(400);
  });

  it("answers 500 when the queue is down", async () => {
    const user = await createUser({ emailVerified: false });
    const { getEmailQueue } = await import("../helpers/app");
    (await getEmailQueue()).add.mockRejectedValueOnce(new Error("queue unavailable"));

    const res = await resend({ email: user.email });

    expect(res.status).toBe(500);
  });

  it("answers 500 when Redis is down and sends no e-mail", async () => {
    const user = await createUser({ emailVerified: false });
    (await getRedis()).set.mockRejectedValueOnce(new Error("redis down"));

    const res = await resend({ email: user.email });

    expect(res.status).toBe(500);
    expect(await lastQueuedJob()).toBeUndefined();
  });

  it("allows 3 requests per IP and blocks the 4th with 429", async () => {
    const user = await createUser({ emailVerified: false });
    for (let i = 0; i < 3; i++) {
      expect((await resend({ email: user.email })).status).toBe(200);
    }

    const res = await resend({ email: user.email });

    expect(res.status).toBe(429);
  });

  it("limits each e-mail address to 3 requests (independent of IP)", async () => {
    const user = await createUser({ emailVerified: false });
    const other = await createUser({ emailVerified: false });
    for (let i = 0; i < 3; i++) {
      await resend({ email: user.email });
      resetRateLimitStore(RATE_LIMIT_PREFIX.resendEmailIp);
    }

    expect((await resend({ email: user.email })).status).toBe(429);
    expect((await resend({ email: other.email })).status).toBe(200);
  });

  it("[FINDING] the per-IP limiter is shared with /register and /forgot-password", async () => {
    const user = await createUser({ emailVerified: false });
    await request(app).post("/api/auth/forgot-password").send({ email: user.email });
    await request(app).post("/api/auth/forgot-password").send({ email: user.email });
    await request(app).post("/api/auth/forgot-password").send({ email: user.email });

    const res = await resend({ email: user.email });

    expect(res.status).toBe(429);
  });
});
