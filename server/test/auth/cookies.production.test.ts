import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

// Must run before ANY application module (src/config/config.ts reads NODE_ENV at import time).
vi.hoisted(() => {
  process.env.NODE_ENV = "production";
});

import request from "supertest";
import type { Express } from "express";
import { getApp } from "../helpers/app";
import {
  authCookie,
  cookieAttributes,
  createUser,
  findSetCookie,
  signAuthToken,
  validRegistration,
} from "../helpers/factories";
import { stubGoogle } from "../helpers/google";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});
afterAll(() => {
  process.env.NODE_ENV = "test";
});

describe("auth cookie + error handling with NODE_ENV=production", () => {
  it("login cookie is HttpOnly, Secure, SameSite=None, Path=/, 1 day", async () => {
    const user = await createUser();

    const res = await request(app).post("/api/auth/login").send({ email: user.email, password: user.password });
    const attrs = cookieAttributes(findSetCookie(res, "token")!);

    expect(res.status).toBe(200);
    expect(attrs).toEqual(expect.arrayContaining(["HttpOnly", "Secure", "SameSite=None", "Path=/", "Max-Age=86400"]));
  });

  it("the Google callback cookie has the same production flags", async () => {
    stubGoogle();
    const res = await request(app).get("/api/auth/google/callback?code=abc").redirects(0);
    const attrs = cookieAttributes(findSetCookie(res, "token")!);

    expect(attrs).toEqual(expect.arrayContaining(["HttpOnly", "Secure", "SameSite=None"]));
  });

  it("the logout cookie-clearing header repeats the Secure / SameSite flags so browsers actually delete it", async () => {
    const user = await createUser();

    const res = await request(app).post("/api/auth/logout").set("Cookie", authCookie(signAuthToken(user.id)));
    const attrs = cookieAttributes(findSetCookie(res, "token")!);

    expect(attrs).toEqual(expect.arrayContaining(["HttpOnly", "Secure", "SameSite=None", "Path=/"]));
  });

  it("5xx and 4xx responses carry no stack, details or internal error object", async () => {
    const { getUserModel } = await import("../helpers/app");
    const User = await getUserModel();
    vi.spyOn(User, "findOne").mockRejectedValueOnce(Object.assign(new Error("boom"), { details: "secret", error: new Error("inner") }));

    const res = await request(app).post("/api/auth/register").send(validRegistration());

    expect(res.status).toBe(500);
    expect(Object.keys(res.body).sort()).toEqual(["message", "statusCode", "success"]);
  });
});
