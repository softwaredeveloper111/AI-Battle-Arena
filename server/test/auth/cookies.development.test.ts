import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

// Must run before ANY application module (src/config/config.ts reads NODE_ENV at import time).
vi.hoisted(() => {
  process.env.NODE_ENV = "development";
});

import request from "supertest";
import type { Express } from "express";
import { getApp, getUserModel } from "../helpers/app.js";
import { cookieAttributes, createUser, findSetCookie, validRegistration } from "../helpers/factories.js";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});
afterAll(() => {
  process.env.NODE_ENV = "test";
});

describe("auth cookie + error handling with NODE_ENV=development", () => {
  it("login cookie is HttpOnly and SameSite=Strict without the Secure flag (plain http on localhost)", async () => {
    const user = await createUser();

    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password });
    const attrs = cookieAttributes(findSetCookie(res, "token")!);

    expect(res.status).toBe(200);
    expect(attrs).toEqual(expect.arrayContaining(["HttpOnly", "SameSite=Strict", "Path=/", "Max-Age=86400"]));
    expect(attrs).not.toContain("Secure");
  });

  it("error responses include the stack trace and underlying error (development only)", async () => {
    const User = await getUserModel();
    vi.spyOn(User, "findOne").mockRejectedValueOnce(
      Object.assign(new Error("boom"), { details: "extra detail", error: new Error("inner failure") }),
    );

    const res = await request(app).post("/api/auth/register").send(validRegistration());

    expect(res.status).toBe(500);
    expect(res.body.stack).toContain("boom");
    expect(res.body.details).toBe("extra detail");
    expect(res.body.error).toBe("inner failure");
  });
});
