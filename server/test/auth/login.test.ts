import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import { getApp } from "../helpers/app";
import {
  bodyText,
  cookieAttributes,
  createUser,
  findSetCookie,
  cookieValue,
  setCookieHeaders,
  SECRETS,
  VALID_PASSWORD,
} from "../helpers/factories";
import { stubGoogle, googleProfile } from "../helpers/google";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});

const login = (body?: unknown) => {
  const req = request(app).post("/api/auth/login");
  return body === undefined ? req : req.send(body as object);
};

describe("POST /api/auth/login", () => {
  describe("success", () => {
    it("logs a verified user in and returns the user without secrets", async () => {
      const user = await createUser();

      const res = await login({ email: user.email, password: user.password });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        statusCode: 200,
        message: "User logged in successfully",
      });
      expect(res.body.data).toMatchObject({ _id: user.id, email: user.email, username: user.username });
      expect(res.body.data).not.toHaveProperty("password");
      expect(res.body.data).not.toHaveProperty("__v");
      expect(bodyText(res)).not.toContain("$2");
      expect(bodyText(res)).not.toContain(user.password);
    });

    it("normalises the e-mail (case + surrounding spaces)", async () => {
      const user = await createUser({ email: "case.user@example.com" });

      const res = await login({ email: "  CASE.User@Example.COM ", password: user.password });

      expect(res.status).toBe(200);
    });

    it("is case-sensitive for the password", async () => {
      const user = await createUser();

      const res = await login({ email: user.email, password: user.password.toUpperCase() });

      expect(res.status).toBe(401);
    });

    it("accepts a login password that would not pass the *registration* rules (login schema only needs a non-empty string)", async () => {
      const user = await createUser();

      const res = await login({ email: user.email, password: "x" });

      // schema passes, credentials are simply wrong
      expect(res.status).toBe(401);
    });
  });

  describe("JWT", () => {
    it("issues a valid HS256 JWT signed with JWT_SECRET_KEY carrying the user id", async () => {
      const user = await createUser();

      const res = await login({ email: user.email, password: user.password });
      const token = cookieValue(res, "token")!;

      const payload = jwt.verify(token, SECRETS.jwt, { algorithms: ["HS256"] }) as jwt.JwtPayload;
      expect(payload.id).toBe(user.id);
      expect(payload.exp! - payload.iat!).toBe(60 * 60 * 24);
      expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "id"]);
    });

    it("does not put the e-mail, password or other PII in the JWT payload", async () => {
      const user = await createUser();

      const res = await login({ email: user.email, password: user.password });
      const decoded = jwt.decode(cookieValue(res, "token")!) as jwt.JwtPayload;

      expect(JSON.stringify(decoded)).not.toContain(user.email);
      expect(JSON.stringify(decoded)).not.toContain(user.password);
    });

    it("rejects the token when verified with a different secret", async () => {
      const user = await createUser();
      const res = await login({ email: user.email, password: user.password });

      expect(() => jwt.verify(cookieValue(res, "token")!, "another-secret")).toThrow();
      expect(() => jwt.verify(cookieValue(res, "token")!, SECRETS.emailVerification)).toThrow();
      expect(() => jwt.verify(cookieValue(res, "token")!, SECRETS.resetPassword)).toThrow();
    });
  });

  describe("cookie", () => {
    it("sets an HttpOnly cookie named token for the whole site that lasts one day", async () => {
      const user = await createUser();

      const res = await login({ email: user.email, password: user.password });
      const cookie = findSetCookie(res, "token")!;
      const attrs = cookieAttributes(cookie);

      expect(setCookieHeaders(res)).toHaveLength(1);
      expect(attrs).toContain("HttpOnly");
      expect(attrs).toContain("Path=/");
      expect(attrs).toContain("Max-Age=86400");
      expect(attrs.some((a) => a.startsWith("Expires="))).toBe(true);
    });

    it("never sets a cookie when the login fails", async () => {
      const user = await createUser();

      const wrong = await login({ email: user.email, password: "Wrong@123" });
      const unknown = await login({ email: "nobody@example.com", password: "Wrong@123" });
      const invalid = await login({ email: "bad", password: "x" });

      for (const res of [wrong, unknown, invalid]) {
        expect(setCookieHeaders(res)).toHaveLength(0);
      }
    });
  });

  describe("validation", () => {
    it("rejects a missing body", async () => {
      const res = await login();

      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toEqual(expect.arrayContaining(["email", "password"]));
    });

    it("rejects a missing e-mail", async () => {
      const res = await login({ password: VALID_PASSWORD });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("email is required");
    });

    it("rejects a missing password", async () => {
      const res = await login({ email: "a@example.com" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("password is required");
    });

    it("rejects an empty password", async () => {
      const res = await login({ email: "a@example.com", password: "" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("password is required");
    });

    it.each(["not-an-email", "a@b", "@example.com", "", "   "])("rejects invalid e-mail %j", async (email) => {
      const res = await login({ email, password: VALID_PASSWORD });
      expect(res.status).toBe(400);
      expect(res.body.errors.map((e: any) => e.field)).toContain("email");
    });

    it.each([
      ["null", null],
      ["a number", 42],
      ["an array", ["a@example.com"]],
      ["a NoSQL operator object", { $ne: null }],
      ["a $gt operator object", { $gt: "" }],
    ])("rejects %s as the e-mail (NoSQL injection guard)", async (_l, email) => {
      const res = await login({ email, password: VALID_PASSWORD });
      expect(res.status).toBe(400);
    });

    it.each([
      ["null", null],
      ["a number", 123456],
      ["an array", [VALID_PASSWORD]],
      ["a NoSQL operator object", { $ne: "" }],
    ])("rejects %s as the password (NoSQL injection guard)", async (_l, password) => {
      const user = await createUser();
      const res = await login({ email: user.email, password });
      expect(res.status).toBe(400);
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("treats a whitespace-only password as a (wrong) password rather than as missing", async () => {
      const user = await createUser();
      const res = await login({ email: user.email, password: "   " });
      expect(res.status).toBe(401);
    });
  });

  describe("failures", () => {
    it("answers 401 'Invalid password' for a wrong password", async () => {
      const user = await createUser();

      const res = await login({ email: user.email, password: "Wrong@123" });

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ success: false, statusCode: 401, message: "Invalid password" });
    });

    it("answers 404 for an unknown account", async () => {
      const res = await login({ email: "ghost@example.com", password: VALID_PASSWORD });

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ success: false, statusCode: 404, message: "User not found" });
    });

    it("[FINDING] account enumeration: unknown e-mail (404 'User not found') is distinguishable from wrong password (401 'Invalid password')", async () => {
      const user = await createUser();

      const unknown = await login({ email: "ghost@example.com", password: "Wrong@123" });
      const wrongPassword = await login({ email: user.email, password: "Wrong@123" });

      expect(unknown.status).not.toBe(wrongPassword.status);
      expect(unknown.body.message).not.toBe(wrongPassword.body.message);
    });

    it("answers 403 for a correct password on an unverified account", async () => {
      const user = await createUser({ emailVerified: false });

      const res = await login({ email: user.email, password: user.password });

      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ success: false, statusCode: 403, message: "Email not verified" });
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("does not reveal the verification state when the password is wrong", async () => {
      const user = await createUser({ emailVerified: false });

      const res = await login({ email: user.email, password: "Wrong@123" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid password");
    });

    it("answers 500 when MongoDB is unavailable", async () => {
      const { getUserModel } = await import("../helpers/app");
      const { vi } = await import("vitest");
      const User = await getUserModel();
      vi.spyOn(User, "findOne").mockImplementationOnce(() => {
        throw new Error("mongo down");
      });

      const res = await login({ email: "a@example.com", password: VALID_PASSWORD });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Google accounts", () => {
    it("a Google-created account cannot be logged into with a guessed password", async () => {
      stubGoogle({ profile: googleProfile({ emails: [{ value: "g.user@gmail.com", verified: true }] }) });
      const cb = await request(app).get("/api/auth/google/callback?code=abc");
      expect(cb.status).toBe(200);

      const res = await login({ email: "g.user@gmail.com", password: VALID_PASSWORD });

      expect(res.status).toBe(401);
    });
  });

  describe("rate limiting", () => {
    it("allows 10 attempts then answers 429 for the 11th (IP based)", async () => {
      const user = await createUser();

      for (let i = 0; i < 10; i++) {
        const res = await login({ email: user.email, password: "Wrong@123" });
        expect(res.status).toBe(401);
      }
      const blocked = await login({ email: user.email, password: user.password });

      expect(blocked.status).toBe(429);
      expect(blocked.body).toEqual({
        success: false,
        statusCode: 429,
        message: "too many request , please try again later",
      });
      expect(setCookieHeaders(blocked)).toHaveLength(0); // even the right password is refused
    });

    it("counts invalid-format requests against the limit", async () => {
      for (let i = 0; i < 10; i++) {
        expect((await login({})).status).toBe(400);
      }
      expect((await login({})).status).toBe(429);
    });

    it("exposes rate-limit headers", async () => {
      const res = await login({});
      const headerNames = Object.keys(res.headers).join(",").toLowerCase();
      expect(headerNames).toMatch(/ratelimit/);
    });
  });
});
