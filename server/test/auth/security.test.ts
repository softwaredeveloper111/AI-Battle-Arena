import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { getApp, getRedis } from "../helpers/app";
import {
  authCookie,
  bodyText,
  createUser,
  issueEmailVerificationToken,
  issueResetToken,
  signAuthToken,
  validRegistration,
  setCookieHeaders,
  VALID_PASSWORD,
} from "../helpers/factories";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});

const JSON_POST_ROUTES = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/resend-verification-link",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
] as const;

describe("cross-cutting: request parsing", () => {
  describe.each(JSON_POST_ROUTES)("POST %s", (route) => {
    it("answers 400 with the standard JSON error shape for malformed JSON", async () => {
      const res = await request(app)
        .post(route)
        .set("Content-Type", "application/json")
        .send('{"email": "a@example.com", "password": ');

      expect(res.status).toBe(400);
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body).toMatchObject({ success: false, statusCode: 400 });
      expect(typeof res.body.message).toBe("string");
    });

    it("answers 400 when the body is sent as text/plain (not parsed => fields missing)", async () => {
      const res = await request(app)
        .post(route)
        .set("Content-Type", "text/plain")
        .send(JSON.stringify({ email: "a@example.com", password: VALID_PASSWORD, token: "x", username: "abc" }));

      expect(res.status).toBe(400);
    });

    it("answers 413 for a JSON body larger than 50 kb", async () => {
      const res = await request(app)
        .post(route)
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ email: "a@example.com", password: "x".repeat(60 * 1024) }));

      expect(res.status).toBe(413);
      expect(res.body).toMatchObject({ success: false, statusCode: 413 });
    });

    it("answers 413 for a form body larger than 10 kb", async () => {
      const res = await request(app)
        .post(route)
        .type("form")
        .send(`email=a%40example.com&password=${"x".repeat(12 * 1024)}`);

      expect(res.status).toBe(413);
    });

    it.each(["get", "put", "patch", "delete"] as const)("does not answer %s", async (method) => {
      const res = await (request(app) as any)[method](route);
      expect(res.status).toBe(404);
    });
  });

  it("does not answer POST on the GET-only routes", async () => {
    for (const route of ["/api/auth/me", "/api/auth/verify-link", "/api/auth/google", "/api/auth/google/callback"]) {
      const res = await request(app).post(route).send({});
      expect(res.status, route).toBe(404);
    }
  });

  it("answers 404 for unknown auth routes", async () => {
    expect((await request(app).get("/api/auth/does-not-exist")).status).toBe(404);
    expect((await request(app).post("/api/auth/refresh-token").send({})).status).toBe(404);
  });

  it("[FINDING] unknown routes answer with Express' default HTML page, not the JSON error format", async () => {
    const res = await request(app).get("/api/auth/does-not-exist");

    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.body).not.toHaveProperty("success");
  });

  it("[FINDING] form-encoded bodies are accepted by the auth endpoints (login works via application/x-www-form-urlencoded)", async () => {
    const user = await createUser();

    const res = await request(app).post("/api/auth/login").type("form").send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(setCookieHeaders(res).length).toBe(1);
  });

  it("form-encoded nested operators are still rejected by Zod (qs extended parsing cannot inject $ne)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .type("form")
      .send("email[$ne]=x&password=y");

    expect(res.status).toBe(400);
  });

  it("serves the health check without touching authentication", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("cross-cutting: error response format", () => {
  const failingCalls: [string, () => request.Test][] = [
    ["validation (register)", () => request(app).post("/api/auth/register").send({})],
    ["validation (login)", () => request(app).post("/api/auth/login").send({})],
    ["unknown user (login)", () => request(app).post("/api/auth/login").send({ email: "x@example.com", password: "y" })],
    ["missing token (me)", () => request(app).get("/api/auth/me")],
    ["bad token (me)", () => request(app).get("/api/auth/me").set("Cookie", "token=abc")],
    ["missing token (logout)", () => request(app).post("/api/auth/logout")],
    ["bad reset token", () => request(app).post("/api/auth/reset-password").send({ token: "abc", password: VALID_PASSWORD })],
    ["unknown e-mail (forgot)", () => request(app).post("/api/auth/forgot-password").send({ email: "x@example.com" })],
    ["unknown e-mail (resend)", () => request(app).post("/api/auth/resend-verification-link").send({ email: "x@example.com" })],
    ["malformed JSON", () => request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{")],
  ];

  it.each(failingCalls)("%s -> { success:false, statusCode, message } and statusCode mirrors the HTTP status", async (_name, call) => {
    const res = await call();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.success).toBe(false);
    expect(res.body.statusCode).toBe(res.status);
    expect(typeof res.body.message).toBe("string");
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it.each(failingCalls)("%s -> never includes a stack trace outside development", async (_name, call) => {
    const res = await call();

    expect(res.body).not.toHaveProperty("stack");
    expect(bodyText(res)).not.toMatch(/\bat\s+\S+\s+\(.*:\d+:\d+\)/); // no "at fn (file:line:col)"
    expect(bodyText(res)).not.toMatch(/node_modules/);
  });

  it("validation errors list every failing field", async () => {
    const res = await request(app).post("/api/auth/register").send({ username: "a", email: "b", password: "c" });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e: any) => e.field).sort();
    expect(fields).toEqual(expect.arrayContaining(["email", "password", "username"]));
    for (const e of res.body.errors) {
      expect(e).toEqual({ field: expect.any(String), message: expect.any(String) });
    }
  });
});

describe("cross-cutting: information leakage", () => {
  it("no auth response contains a password hash, a JWT secret or a Redis key", async () => {
    const user = await createUser();
    const token = signAuthToken(user.id);
    const responses = [
      await request(app).post("/api/auth/register").send(validRegistration()),
      await request(app).post("/api/auth/login").send({ email: user.email, password: user.password }),
      await request(app).get("/api/auth/me").set("Cookie", authCookie(token)),
      await request(app)
        .post("/api/auth/reset-password")
        .send({ token: await issueResetToken(user.id), password: "NewPassw0rd@2" }),
    ];

    for (const res of responses) {
      const text = bodyText(res);
      expect(text).not.toContain("$2a$");
      expect(text).not.toContain("$2b$");
      expect(text).not.toContain("test-jwt-secret");
      expect(text).not.toContain("email-verification:");
      expect(text).not.toContain("password-reset:");
      expect(text).not.toContain("blacklist:");
    }
  });

  it("the verification page does not echo the token back (no reflected XSS)", async () => {
    const payload = '"><script>alert(1)</script>';
    const res = await request(app).get("/api/auth/verify-link").query({ token: payload });

    expect(res.text).not.toContain("<script>alert(1)</script>");
  });

  it("error messages do not echo attacker-controlled input", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "<script>alert(1)</script>@example.com", password: "x" });

    expect(res.status).toBe(400);
    expect(bodyText(res)).not.toContain("<script>alert(1)</script>@example.com");
  });

  it("[FINDING] every response advertises the framework via X-Powered-By and no hardening headers are set", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-powered-by"]).toBe("Express");
    expect(res.headers["x-content-type-options"]).toBeUndefined();
    expect(res.headers["strict-transport-security"]).toBeUndefined();
  });

  it("sends no CORS headers (the API is not exposed cross-origin by default)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Origin", "https://evil.example")
      .send({ email: "a@example.com", password: "x" });

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("cross-cutting: authentication bypass attempts", () => {
  const protectedCalls: [string, (cookie?: string) => request.Test][] = [
    ["GET /me", (c) => withCookie(request(app).get("/api/auth/me"), c)],
    ["POST /logout", (c) => withCookie(request(app).post("/api/auth/logout"), c)],
  ];

  const withCookie = (req: request.Test, cookie?: string) => (cookie ? req.set("Cookie", cookie) : req);

  it.each(protectedCalls)("%s rejects identity headers / query params used instead of a token", async (_n, call) => {
    const user = await createUser();
    const res = await call()
      .set("X-User-Id", user.id)
      .set("X-Forwarded-User", user.id)
      .set("Authorization", `Basic ${Buffer.from(`${user.email}:${user.password}`).toString("base64")}`)
      .query({ userId: user.id, id: user.id, user: user.id });

    expect(res.status).toBe(401);
  });

  it.each(protectedCalls)("%s rejects a cookie that only *contains* a valid token", async (_n, call) => {
    const user = await createUser();
    const res = await call(`token=x${signAuthToken(user.id)}`);
    expect(res.status).toBe(401);
  });

  it.each(protectedCalls)("%s rejects a token with trailing junk / surrounding whitespace in the signature", async (_n, call) => {
    const user = await createUser();
    const res = await call(`token=${signAuthToken(user.id)}AAAA`);
    expect(res.status).toBe(401);
  });

  it.each(protectedCalls)("%s uses the first token cookie only; a second bogus one cannot upgrade access", async (_n, call) => {
    const res = await call("token=bogus; token=also-bogus");
    expect(res.status).toBe(401);
  });

  it("a user cannot read another user's profile by swapping the id inside a signed token", async () => {
    const a = await createUser();
    const b = await createUser();
    const [h, , s] = signAuthToken(a.id).split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ id: b.id, iat: 1, exp: 9999999999 })).toString("base64url");

    const res = await request(app).get("/api/auth/me").set("Cookie", `token=${h}.${forgedPayload}.${s}`);

    expect(res.status).toBe(401);
  });

  it("the verification and reset flows cannot be completed with another user's token + a chosen id", async () => {
    const victim = await createUser({ emailVerified: false });
    const attacker = await createUser({ emailVerified: false });
    const attackerToken = await issueEmailVerificationToken(attacker.id);

    const res = await request(app).get("/api/auth/verify-link").query({ token: attackerToken, id: victim.id, userId: victim.id });

    expect(res.status).toBe(200); // verifies the *attacker's own* account only
    const { getUserModel } = await import("../helpers/app");
    const User = await getUserModel();
    expect((await User.findById(victim.id))!.emailVerified).toBe(false);
  });

  it("spoofing X-Forwarded-For does not bypass IP rate limits", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).post("/api/auth/login").set("X-Forwarded-For", `10.0.0.${i}`).send({ email: "a@example.com", password: "x" });
    }
    const res = await request(app).post("/api/auth/login").set("X-Forwarded-For", "203.0.113.77").send({ email: "a@example.com", password: "x" });

    expect(res.status).toBe(429);
  });

  it("brute forcing the password is throttled to 10 attempts per 15 minutes per IP", async () => {
    const user = await createUser();
    let rejected = 0;
    for (let i = 0; i < 15; i++) {
      const res = await request(app).post("/api/auth/login").send({ email: user.email, password: `Guess@${i}aA` });
      if (res.status === 429) rejected++;
    }

    expect(rejected).toBe(5);
  });

  it("SQL/NoSQL style payloads in string fields are treated as ordinary (wrong) credentials", async () => {
    await createUser();
    // "admin'--@example.com" is a syntactically valid address (apostrophes are legal in the local part)
    const validLooking = await request(app).post("/api/auth/login").send({ email: "admin'--@example.com", password: "' OR '1'='1" });
    expect(validLooking.status).toBe(404);
    expect(setCookieHeaders(validLooking)).toHaveLength(0);

    // this one is not a valid address at all
    const invalid = await request(app).post("/api/auth/login").send({ email: "a@example.com' OR '1'='1", password: "x" });
    expect(invalid.status).toBe(400);
    expect(setCookieHeaders(invalid)).toHaveLength(0);

    const res = await request(app).post("/api/auth/login").send({ email: "someone@example.com", password: "' OR '1'='1" });
    expect(res.status).toBe(404);
    expect(setCookieHeaders(res)).toHaveLength(0);
  });


  it("the Redis blacklist cannot be bypassed by token re-encoding (case / padding changes break the signature)", async () => {
    const user = await createUser();
    const token = signAuthToken(user.id);
    await request(app).post("/api/auth/logout").set("Cookie", authCookie(token));

    for (const variant of [token, token.toUpperCase(), `${token}=`, `${token}.`]) {
      const res = await request(app).get("/api/auth/me").set("Cookie", authCookie(variant));
      expect(res.status).toBe(401);
    }
  });

  it("every Redis key written by the auth flows is namespaced and holds no raw tokens", async () => {
    const user = await createUser({ emailVerified: false });
    await request(app).post("/api/auth/forgot-password").send({ email: user.email });
    await request(app).post("/api/auth/resend-verification-link").send({ email: user.email });

    const redis = await getRedis();
    const keys: string[] = redis.__keys();
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).toMatch(/^(email-verification|password-reset:user|blacklist:token|user:profile):/);
      const value = await redis.get(key);
      expect(value).not.toMatch(/^eyJ/); // not a JWT
    }
  });
});
