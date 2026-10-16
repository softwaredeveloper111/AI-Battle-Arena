import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { getApp, getEmailQueue, getRedis, getUserModel } from "../helpers/app";
import {
  createUser,
  lastQueuedJob,
  queuedJobs,
  sha256,
  validRegistration,
  VALID_PASSWORD,
  bodyText,
  setCookieHeaders,
} from "../helpers/factories";
import { resetRateLimitStore, RATE_LIMIT_PREFIX } from "../helpers/inMemoryRateLimitStore";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});

const register = (body?: unknown) => {
  const req = request(app).post("/api/auth/register");
  return body === undefined ? req : req.send(body as object);
};

describe("POST /api/auth/register", () => {
  describe("success", () => {
    it("creates the user and answers 201 without leaking secrets", async () => {
      const payload = validRegistration();
      const res = await register(payload);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        success: true,
        statusCode: 201,
        message: "User created successfully and email verification link sent",
      });
      expect(res.body.data).toMatchObject({
        username: payload.username,
        email: payload.email,
        emailVerified: false,
      });
      expect(res.body.data._id).toBeTruthy();
      expect(res.body.data).not.toHaveProperty("password");
      expect(res.body.data).not.toHaveProperty("__v");
      expect(bodyText(res)).not.toContain("$2"); // no bcrypt hash anywhere
      expect(bodyText(res)).not.toContain(payload.password);
    });

    it("stores a bcrypt hash, never the plain-text password", async () => {
      const payload = validRegistration();
      await register(payload);

      const User = await getUserModel();
      const stored = await User.findOne({ email: payload.email }).select("+password");
      expect(stored?.password).not.toBe(payload.password);
      expect(stored?.password).toMatch(/^\$2[aby]\$/);
      await expect(stored!.comparePassword(payload.password)).resolves.toBe(true);
    });

    it("leaves the account unverified and does not log the user in", async () => {
      const res = await register(validRegistration());

      expect(res.body.data.emailVerified).toBe(false);
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("queues exactly one verification e-mail job with retry/backoff options", async () => {
      const payload = validRegistration();
      await register(payload);

      const jobs = await queuedJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0]!.name).toBe("verification-email");
      expect(jobs[0]!.data).toMatchObject({ email: payload.email, username: payload.username });
      expect(typeof jobs[0]!.data.verificationToken).toBe("string");
      expect(jobs[0]!.opts).toEqual({
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      });
    });

    it("stores only the SHA-256 hash of the verification token in Redis with a 5 minute TTL", async () => {
      const payload = validRegistration();
      const res = await register(payload);
      const redis = await getRedis();
      const key = `email-verification:${res.body.data._id}`;

      const job = await lastQueuedJob();
      expect(await redis.get(key)).toBe(sha256(job!.data.verificationToken));
      expect(await redis.get(key)).not.toBe(job!.data.verificationToken);
      expect(await redis.ttl(key)).toBeGreaterThan(290);
      expect(await redis.ttl(key)).toBeLessThanOrEqual(300);
    });

    it("trims and lower-cases username and e-mail before storing them", async () => {
      const res = await register(
        validRegistration({ username: "  MiXed_Case  ", email: "  Mixed.Case@Example.COM  " }),
      );

      expect(res.status).toBe(201);
      expect(res.body.data.username).toBe("mixed_case");
      expect(res.body.data.email).toBe("mixed.case@example.com");
    });

    it("strips unknown fields so mass-assignment (emailVerified, _id, role) is impossible", async () => {
      const res = await register(
        validRegistration({
          emailVerified: true,
          _id: "507f1f77bcf86cd799439011",
          role: "admin",
          isAdmin: true,
        }),
      );

      expect(res.status).toBe(201);
      expect(res.body.data.emailVerified).toBe(false);
      expect(res.body.data._id).not.toBe("507f1f77bcf86cd799439011");
      expect(res.body.data).not.toHaveProperty("role");
      expect(res.body.data).not.toHaveProperty("isAdmin");
    });

    it("ignores a polluted __proto__ key in the body", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send(
          `{"username":"proto_user","email":"proto@example.com","password":"${VALID_PASSWORD}","__proto__":{"emailVerified":true}}`,
        );

      expect(res.status).toBe(201);
      expect(res.body.data.emailVerified).toBe(false);
      expect(({} as any).emailVerified).toBeUndefined();
    });
  });

  describe("missing / empty fields", () => {
    it("rejects a request without any body", async () => {
      const res = await register();

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      const fields = res.body.errors.map((e: any) => e.field);
      expect(fields).toEqual(expect.arrayContaining(["username", "email", "password"]));
    });

    it("rejects an empty JSON object listing all three fields", async () => {
      const res = await register({});

      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveLength(3);
    });

    it.each(["username", "email", "password"])("rejects a body missing %s", async (field) => {
      const payload: Record<string, unknown> = validRegistration();
      delete payload[field];

      const res = await register(payload);

      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain(field);
      expect(res.body.message).toBe(`${field} is required`);
    });

    it.each(["username", "email", "password"])("rejects an empty-string %s", async (field) => {
      const res = await register(validRegistration({ [field]: "" }));

      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain(field);
    });

    it.each(["username", "email"])("rejects a whitespace-only %s", async (field) => {
      const res = await register(validRegistration({ [field]: "     " }));

      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain(field);
    });

    it("rejects a whitespace-only password (spaces are not an allowed character)", async () => {
      const res = await register(validRegistration({ password: "        " }));

      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain("password");
    });
  });

  describe("e-mail format", () => {
    it.each([
      "plainaddress",
      "missing-at.example.com",
      "@example.com",
      "user@",
      "user@@example.com",
      "user@example",
      "us er@example.com",
      "user@exa mple.com",
    ])("rejects invalid e-mail %j", async (email) => {
      const res = await register(validRegistration({ email }));

      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain("email");
    });
  });

  describe("username rules", () => {
    it("rejects 2 characters", async () => {
      const res = await register(validRegistration({ username: "ab" }));
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("username must be atleast 3 characters long");
    });

    it("accepts exactly 3 characters", async () => {
      const res = await register(validRegistration({ username: "abc" }));
      expect(res.status).toBe(201);
    });

    it("accepts exactly 20 characters", async () => {
      const res = await register(validRegistration({ username: "a".repeat(20) }));
      expect(res.status).toBe(201);
    });

    it("rejects 21 characters", async () => {
      const res = await register(validRegistration({ username: "a".repeat(21) }));
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("username must be at most 20 characters long");
    });

    it.each(["bad-name", "bad name", "bad.name", "bäd_name", "<script>", "a$bc", "na\u200bme", "joe@mail"])(
      "rejects invalid characters in username %j",
      async (username) => {
        const res = await register(validRegistration({ username }));
        expect(res.status).toBe(400);
        expect(res.body.errors.map((e: any) => e.field)).toContain("username");
      },
    );

    it("accepts digits and underscores", async () => {
      const res = await register(validRegistration({ username: "_user_123_" }));
      expect(res.status).toBe(201);
    });
  });

  describe("password rules", () => {
    it("rejects 5 characters", async () => {
      const res = await register(validRegistration({ password: "Aa1@x" }));
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("password must be atleast 6 characters long");
    });

    it("accepts exactly 6 characters", async () => {
      const res = await register(validRegistration({ password: "Aa1@xy" }));
      expect(res.status).toBe(201);
    });

    it("accepts exactly 32 characters", async () => {
      const res = await register(validRegistration({ password: `Aa1@${"x".repeat(28)}` }));
      expect(res.status).toBe(201);
    });

    it("rejects 33 characters", async () => {
      const res = await register(validRegistration({ password: `Aa1@${"x".repeat(29)}` }));
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("password must be at most 32 characters long");
    });

    it.each([
      ["no uppercase", "passw0rd@1"],
      ["no lowercase", "PASSW0RD@1"],
      ["no number", "Password@@"],
      ["no special character", "Passw0rd11"],
    ])("rejects a password with %s", async (_label, password) => {
      const res = await register(validRegistration({ password }));
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain("password");
    });

    it.each([
      ["a disallowed special char (#)", "Passw0rd#1"],
      ["a space", "Passw0rd @1"],
      ["a non-ASCII letter", "Pässw0rd@1"],
      ["an emoji", "Passw0rd@1😀"],
      ["a dash", "Passw0rd-@1"],
    ])("rejects a password containing %s", async (_label, password) => {
      const res = await register(validRegistration({ password }));
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain("password");
    });

    it.each(["@", "$", "!", "%", "*", "?", "&"])("accepts the special character %s", async (ch) => {
      const res = await register(validRegistration({ password: `Passw0rd${ch}` }));
      expect(res.status).toBe(201);
    });

    it("does not trim the password", async () => {
      const res = await register(validRegistration({ password: " Passw0rd@1 " }));
      expect(res.status).toBe(400);
    });
  });

  describe("wrong data types", () => {
    it.each([
      ["null", null],
      ["a number", 12345],
      ["an array", ["a@b.com"]],
      ["an object", { $ne: null }],
      ["a boolean", true],
    ])("rejects %s as the e-mail", async (_label, email) => {
      const res = await register(validRegistration({ email }));
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain("email");
    });

    it.each([
      ["null", null],
      ["a number", 123456],
      ["an array", ["Passw0rd@1"]],
      ["an object", { a: 1 }],
    ])("rejects %s as the password", async (_label, password) => {
      const res = await register(validRegistration({ password }));
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain("password");
    });

    it.each([
      ["null", null],
      ["a number", 12345],
      ["an array", ["abc"]],
      ["an object", { $gt: "" }],
    ])("rejects %s as the username", async (_label, username) => {
      const res = await register(validRegistration({ username }));
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain("username");
    });

    it.each([
      ["null", null],
      ["a string", "nope"],
      ["an array", []],
      ["a number", 5],
    ])("rejects %s as the whole body", async (_label, body) => {
      const res = await request(app)
        .post("/api/auth/register")
        .set("Content-Type", "application/json")
        .send(JSON.stringify(body));

      expect(res.status).toBe(400);
    });
  });

  describe("duplicates", () => {
    it("answers 409 for an already registered e-mail", async () => {
      const existing = await createUser();

      const res = await register(validRegistration({ email: existing.email }));

      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ success: false, statusCode: 409, message: "Account already exists" });
      expect(await queuedJobs()).toHaveLength(0);
    });

    it("treats the e-mail case-insensitively and ignores surrounding spaces", async () => {
      const existing = await createUser({ email: "dupe@example.com" });

      const res = await register(validRegistration({ email: `  ${existing.email.toUpperCase()} ` }));

      expect(res.status).toBe(409);
    });

    it("also answers 409 when the existing account is still unverified", async () => {
      const existing = await createUser({ emailVerified: false });

      const res = await register(validRegistration({ email: existing.email }));

      expect(res.status).toBe(409);
    });

    it("does not create a second user document for a duplicate e-mail", async () => {
      const existing = await createUser();
      await register(validRegistration({ email: existing.email }));

      const User = await getUserModel();
      expect(await User.countDocuments({ email: existing.email })).toBe(1);
    });

    it("[FINDING] allows several accounts with the same username (username is not unique)", async () => {
      const first = await createUser({ username: "shared_name" });
      expect(first.username).toBe("shared_name");

      const res = await register(validRegistration({ username: "shared_name" }));

      expect(res.status).toBe(201);
      const User = await getUserModel();
      expect(await User.countDocuments({ username: "shared_name" })).toBe(2);
    });
  });

  describe("infrastructure failures", () => {
    it("answers 500 when the e-mail queue is down", async () => {
      const queue = await getEmailQueue();
      queue.add.mockRejectedValueOnce(new Error("queue unavailable"));

      const res = await register(validRegistration());

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(500);
    });

    it("[FINDING] a queue failure leaves an orphaned unverified user behind (no rollback)", async () => {
      const queue = await getEmailQueue();
      queue.add.mockRejectedValueOnce(new Error("queue unavailable"));
      const payload = validRegistration();

      const res = await register(payload);
      expect(res.status).toBe(500);

      const User = await getUserModel();
      const orphan = await User.findOne({ email: payload.email });
      expect(orphan).not.toBeNull();
      expect(orphan!.emailVerified).toBe(false);

      // ...and the person can no longer register with that address:
      const retry = await register(payload);
      expect(retry.status).toBe(409);
    });

    it("answers 500 when Redis is down while storing the verification token", async () => {
      const redis = await getRedis();
      redis.set.mockRejectedValueOnce(new Error("redis down"));

      const res = await register(validRegistration());

      expect(res.status).toBe(500);
      expect(await queuedJobs()).toHaveLength(0);
    });

    it("answers 500 when MongoDB fails and never creates a partial result", async () => {
      const User = await getUserModel();
      vi.spyOn(User, "findOne").mockRejectedValueOnce(new Error("mongo down"));

      const res = await register(validRegistration());

      expect(res.status).toBe(500);
      expect(await queuedJobs()).toHaveLength(0);
    });

    it("[FINDING] raw internal error messages are echoed to the client", async () => {
      const User = await getUserModel();
      vi.spyOn(User, "findOne").mockRejectedValueOnce(
        new Error("connect ECONNREFUSED 10.0.0.5:27017"),
      );

      const res = await register(validRegistration());

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("connect ECONNREFUSED 10.0.0.5:27017");
    });
  });

  describe("rate limiting", () => {
    it("blocks the 4th request from one IP (shared 3-per-15-minutes e-mail limiter)", async () => {
      for (let i = 0; i < 3; i++) {
        expect((await register(validRegistration())).status).toBe(201);
      }

      const res = await register(validRegistration());

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        success: false,
        statusCode: 429,
        message: "too many request , please try again later",
      });
    });

    it("counts invalid requests too (rate limiting runs before validation)", async () => {
      for (let i = 0; i < 3; i++) {
        expect((await register({})).status).toBe(400);
      }

      expect((await register(validRegistration())).status).toBe(429);
    });

    it("limits the same e-mail address independently of the IP limiter", async () => {
      const email = "spam-target@example.com";
      for (let i = 0; i < 3; i++) {
        await register(validRegistration({ email }));
        resetRateLimitStore(RATE_LIMIT_PREFIX.resendEmailIp); // isolate the per-e-mail limiter
      }

      const sameEmail = await register(validRegistration({ email }));
      const otherEmail = await register(validRegistration());

      expect(sameEmail.status).toBe(429);
      expect(sameEmail.body.message).toBe("too many requests, please try again later");
      expect(otherEmail.status).toBe(201);
    });

    it("keys the per-e-mail limiter on the normalised address (case and spaces do not bypass it)", async () => {
      for (const variant of ["case@example.com", "CASE@example.com", "  Case@Example.com "]) {
        await register(validRegistration({ email: variant }));
        resetRateLimitStore(RATE_LIMIT_PREFIX.resendEmailIp);
      }

      const res = await register(validRegistration({ email: "case@example.com" }));

      expect(res.status).toBe(429);
    });
  });
});
