import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import type { Express } from "express";
import type { Response } from "supertest";
import { getEmailQueue, getRedis, getUserModel } from "./app";
import { TEST_ENV } from "./testEnv";

export const SECRETS = {
  jwt: TEST_ENV.JWT_SECRET_KEY as string,
  emailVerification: TEST_ENV.EMAIL_VERIFICATION_SECRET_KEY as string,
  resetPassword: TEST_ENV.RESET_PASSWORD_SECRET_KEY as string,
};

export const VALID_PASSWORD = "Passw0rd@1";

let counter = 0;

/** unique, schema-valid registration payload */
export const validRegistration = (overrides: Record<string, unknown> = {}) => {
  counter += 1;
  return {
    username: `user_${counter}`,
    email: `user${counter}@example.com`,
    password: VALID_PASSWORD,
    ...overrides,
  };
};

export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

/** Insert a user straight into MongoDB (password is hashed by the model's pre-save hook). */
export const createUser = async (
  overrides: Partial<{ username: string; email: string; password: string; emailVerified: boolean }> = {},
) => {
  const User = await getUserModel();
  const data = { ...validRegistration(), emailVerified: true, ...overrides };
  const doc = await User.create(data);
  return { doc, id: String(doc._id), ...data };
};

/* ------------------------------ token helpers ------------------------------ */

export const signAuthToken = (id: string, options: jwt.SignOptions = { expiresIn: "1d" }) =>
  jwt.sign({ id }, SECRETS.jwt, options);

export const signEmailToken = (id: string, options: jwt.SignOptions = { expiresIn: "5m" }) =>
  jwt.sign({ id }, SECRETS.emailVerification, options);

export const signResetToken = (id: string, options: jwt.SignOptions = { expiresIn: "5m" }) =>
  jwt.sign({ id }, SECRETS.resetPassword, options);

/** a token that is already expired (signed 1 hour ago, valid for 1 minute) */
export const expiredToken = (id: string, secret: string) =>
  jwt.sign({ id, iat: Math.floor(Date.now() / 1000) - 3600 }, secret, { expiresIn: 60 });

/** Sign a token AND register it in (fake) Redis the same way the controllers do. */
export const issueEmailVerificationToken = async (id: string) => {
  const token = signEmailToken(id);
  await (await getRedis()).set(`email-verification:${id}`, sha256(token), "EX", 300);
  return token;
};

export const issueResetToken = async (id: string) => {
  const token = signResetToken(id);
  await (await getRedis()).set(`password-reset:user:${id}`, sha256(token), "EX", 300);
  return token;
};

/* ------------------------------ cookie helpers ------------------------------ */

export const setCookieHeaders = (res: Response): string[] => {
  const header = res.headers["set-cookie"] as unknown;
  if (!header) return [];
  return Array.isArray(header) ? header : [String(header)];
};

/** Find a Set-Cookie header by cookie name. */
export const findSetCookie = (res: Response, name: string) =>
  setCookieHeaders(res).find((c) => c.startsWith(`${name}=`));

export const cookieValue = (res: Response, name: string) => {
  const raw = findSetCookie(res, name);
  return raw ? raw.split(";")[0]!.slice(name.length + 1) : undefined;
};

export const cookieAttributes = (raw: string) => raw.split(";").slice(1).map((a) => a.trim());

export const authCookie = (token: string) => `token=${token}`;

/** Perform a REAL login through the API and return the auth cookie value. */
export const loginAndGetToken = async (app: Express, email: string, password: string) => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  const token = cookieValue(res, "token");
  if (res.status !== 200 || !token) {
    throw new Error(`login helper failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return token;
};

/* ------------------------------ queue helpers ------------------------------ */

export const queuedJobs = async () => {
  const queue = await getEmailQueue();
  return (queue.add.mock.calls as any[][]).map(([name, data, opts]) => ({ name, data, opts }));
};

export const lastQueuedJob = async () => {
  const jobs = await queuedJobs();
  return jobs[jobs.length - 1];
};

/** Assert nothing sensitive (hashes / password fields) is present in a JSON response body. */
export const bodyText = (res: Response) => JSON.stringify(res.body ?? {}) + String(res.text ?? "");
