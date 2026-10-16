import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Express } from "express";
import { getApp, getUserModel } from "../helpers/app";
import {
  bodyText,
  cookieAttributes,
  cookieValue,
  createUser,
  findSetCookie,
  SECRETS,
  setCookieHeaders,
  VALID_PASSWORD,
} from "../helpers/factories";
import { blockGoogleNetwork, googleProfile, stubGoogle } from "../helpers/google";

let app: Express;
beforeAll(async () => {
  app = await getApp();
});

// every test starts with the network to Google blocked; tests opt in via stubGoogle()
beforeEach(() => blockGoogleNetwork());

const callback = (query = "code=fake-code") => request(app).get(`/api/auth/google/callback?${query}`).redirects(0);

describe("GET /api/auth/google (initiation)", () => {
  it("redirects (302) to Google's OAuth 2.0 consent screen", async () => {
    const res = await request(app).get("/api/auth/google").redirects(0);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location!);
    expect(location.origin + location.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
  });

  it("requests exactly the 'profile' and 'email' scopes", async () => {
    const res = await request(app).get("/api/auth/google").redirects(0);

    const scopes = new URL(res.headers.location!).searchParams.get("scope")!.split(" ");
    expect(scopes.sort()).toEqual(["email", "profile"]);
  });

  it("uses the configured client id, callback URL and the authorization-code flow", async () => {
    const res = await request(app).get("/api/auth/google").redirects(0);

    const params = new URL(res.headers.location!).searchParams;
    expect(params.get("client_id")).toBe("test-google-client-id");
    expect(params.get("redirect_uri")).toBe("http://backend.test/api/auth/google/callback");
    expect(params.get("response_type")).toBe("code");
  });

  it("never leaks the client secret in the redirect", async () => {
    const res = await request(app).get("/api/auth/google").redirects(0);
    expect(res.headers.location).not.toContain("test-google-client-secret");
  });

  it("does not set any cookie before the user has authenticated", async () => {
    const res = await request(app).get("/api/auth/google").redirects(0);
    expect(setCookieHeaders(res)).toHaveLength(0);
  });

  it("is rate limited to 10 requests per IP / 15 minutes", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await request(app).get("/api/auth/google").redirects(0)).status).toBe(302);
    }
    const res = await request(app).get("/api/auth/google").redirects(0);

    expect(res.status).toBe(429);
    expect(res.body.message).toBe("too many request , please try again later");
  });

  it("only responds to GET", async () => {
    const res = await request(app).post("/api/auth/google").send({});
    expect(res.status).toBe(404);
  });
});

describe("GET /api/auth/google/callback", () => {
  describe("successful sign-in", () => {
    it("creates a verified account for a new Google user and answers 200 with the user", async () => {
      stubGoogle({ profile: googleProfile({ displayName: "Jane Doe", emails: [{ value: "Jane.Doe@Gmail.com", verified: true }] }) });

      const res = await callback();

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ success: true, statusCode: 200, message: "user get successfully" });
      expect(res.body.data).toMatchObject({
        email: "jane.doe@gmail.com",
        username: "jane_doe",
        emailVerified: true,
      });
      expect(res.body.data).not.toHaveProperty("password");
      expect(bodyText(res)).not.toContain("$2");
    });

    it("persists exactly one user, with a random hashed password", async () => {
      stubGoogle();

      await callback();

      const User = await getUserModel();
      const all = await User.find({}).select("+password");
      expect(all).toHaveLength(1);
      expect(all[0]!.password).toMatch(/^\$2[aby]\$/);
    });

    it("issues the same kind of auth cookie as the password login (JWT, HttpOnly, 1 day)", async () => {
      stubGoogle();

      const res = await callback();
      const cookie = findSetCookie(res, "token")!;
      const attrs = cookieAttributes(cookie);

      expect(attrs).toContain("HttpOnly");
      expect(attrs).toContain("Path=/");
      expect(attrs).toContain("Max-Age=86400");
      const payload = jwt.verify(cookieValue(res, "token")!, SECRETS.jwt) as jwt.JwtPayload;
      expect(payload.id).toBe(res.body.data._id);
      expect(payload.exp! - payload.iat!).toBe(86400);
    });

    it("the issued cookie authenticates /api/auth/me", async () => {
      stubGoogle();
      const res = await callback();

      const me = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `token=${cookieValue(res, "token")}`);

      expect(me.status).toBe(200);
      expect(me.body.data.email).toBe("jane.doe@gmail.com");
    });

    it("sanitises odd display names into a valid username", async () => {
      stubGoogle({ profile: googleProfile({ displayName: "Zoë O'Brien-Smith!!", emails: [{ value: "zoe@gmail.com" }] }) });

      const res = await callback();

      expect(res.status).toBe(200);
      expect(res.body.data.username).toMatch(/^[a-z0-9_]{3,20}$/);
    });

    it("truncates very long display names to 20 characters", async () => {
      stubGoogle({ profile: googleProfile({ displayName: "A".repeat(80), emails: [{ value: "long@gmail.com" }] }) });

      const res = await callback();

      expect(res.status).toBe(200);
      expect(res.body.data.username).toHaveLength(20);
    });

    it("generates a username when the display name is empty or too short", async () => {
      stubGoogle({ profile: googleProfile({ displayName: "", emails: [{ value: "noname@gmail.com" }] }) });
      const empty = await callback();
      expect(empty.body.data.username).toMatch(/^user_\d{4}$/);

      stubGoogle({ profile: googleProfile({ displayName: "Al", emails: [{ value: "al@gmail.com" }] }) });
      const short = await callback();
      expect(short.body.data.username).toMatch(/^al\d{4}$/);
    });
  });

  describe("existing accounts", () => {
    it("logs an existing verified user in without creating a duplicate", async () => {
      const existing = await createUser({ email: "member@gmail.com" });
      stubGoogle({ profile: googleProfile({ emails: [{ value: "member@gmail.com", verified: true }] }) });

      const res = await callback();

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(existing.id);
      expect(await (await getUserModel()).countDocuments({})).toBe(1);
    });

    it("keeps the existing username (does not overwrite it with the Google name)", async () => {
      await createUser({ email: "member@gmail.com", username: "my_handle" });
      stubGoogle({ profile: googleProfile({ displayName: "Totally Different", emails: [{ value: "member@gmail.com" }] }) });

      const res = await callback();

      expect(res.body.data.username).toBe("my_handle");
    });

    it("matches the e-mail address case-insensitively", async () => {
      const existing = await createUser({ email: "member@gmail.com" });
      stubGoogle({ profile: googleProfile({ emails: [{ value: "MEMBER@Gmail.com" }] }) });

      const res = await callback();

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(existing.id);
    });

    it("marks a previously unverified e-mail account as verified (Google vouches for the address)", async () => {
      const existing = await createUser({ email: "member@gmail.com", emailVerified: false });
      stubGoogle({ profile: googleProfile({ emails: [{ value: "member@gmail.com", verified: true }] }) });

      const res = await callback();

      expect(res.status).toBe(200);
      expect(res.body.data.emailVerified).toBe(true);
      expect((await (await getUserModel()).findById(existing.id))!.emailVerified).toBe(true);
    });

    it("[FINDING] pre-registration takeover: the attacker's password still works after the victim signs in with Google", async () => {
      // attacker registers the victim's address with a password they know (stays unverified)
      const attackerPassword = "Attacker@123";
      await createUser({ email: "victim@gmail.com", password: attackerPassword, emailVerified: false });
      // later the real owner uses "Continue with Google" -> account is marked verified
      stubGoogle({ profile: googleProfile({ emails: [{ value: "victim@gmail.com", verified: true }] }) });
      expect((await callback()).status).toBe(200);

      // the attacker can now log in with the password they set at the start
      const login = await request(app)
        .post("/api/auth/login")
        .send({ email: "victim@gmail.com", password: attackerPassword });

      expect(login.status).toBe(200);
    });

    it("[FINDING] an e-mail the profile marks as NOT verified by Google is still trusted", async () => {
      stubGoogle({ profile: googleProfile({ emails: [{ value: "unverified@gmail.com", verified: false }] }) });

      const res = await callback();

      expect(res.status).toBe(200);
      expect(res.body.data.emailVerified).toBe(true);
    });

    it("only uses the first e-mail of the profile", async () => {
      stubGoogle({
        profile: googleProfile({
          emails: [{ value: "first@gmail.com" }, { value: "second@gmail.com" }],
        }),
      });

      const res = await callback();

      expect(res.body.data.email).toBe("first@gmail.com");
    });
  });

  describe("failures", () => {
    it("redirects to the frontend login page when the user denies access", async () => {
      const res = await callback("error=access_denied");

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe("http://frontend.test/login");
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("redirects to Google when the callback is hit without code or error", async () => {
      const res = await callback("");

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("accounts.google.com");
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("answers 500 with no cookie when Google rejects the authorization code", async () => {
      stubGoogle({ tokenError: new Error("invalid_grant") });

      const res = await callback("code=bad");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(setCookieHeaders(res)).toHaveLength(0);
      expect(await (await getUserModel()).countDocuments({})).toBe(0);
    });

    it("answers 500 when Google's token endpoint returns an OAuth error body", async () => {
      stubGoogle({ tokenError: { statusCode: 400, data: JSON.stringify({ error: "invalid_grant", error_description: "Bad Request" }) } });

      const res = await callback("code=bad");

      expect(res.status).toBe(500);
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("answers 500 when the Google profile cannot be fetched", async () => {
      stubGoogle({ profileError: new Error("userinfo unavailable") });

      const res = await callback();

      expect(res.status).toBe(500);
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("answers 500 and creates no user when the profile has no e-mail", async () => {
      stubGoogle({ profile: googleProfile({ emails: [] }) });

      const res = await callback();

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Google account email is unavailable");
      expect(setCookieHeaders(res)).toHaveLength(0);
      expect(await (await getUserModel()).countDocuments({})).toBe(0);
    });

    it("answers 500 when the profile lacks the emails array entirely", async () => {
      const profile = googleProfile();
      delete (profile as any).emails;
      stubGoogle({ profile });

      const res = await callback();

      expect(res.status).toBe(500);
    });

    it("answers 500 for a syntactically invalid Google e-mail (model validation)", async () => {
      stubGoogle({ profile: googleProfile({ emails: [{ value: "not-an-email" }] }) });

      const res = await callback();

      expect(res.status).toBe(500);
      expect(await (await getUserModel()).countDocuments({})).toBe(0);
    });

    it("does not authenticate with a client-supplied token/state/user query parameters", async () => {
      const res = await callback("user=admin&email=admin@example.com&token=abc");

      expect(res.status).toBe(302); // no code => straight back to Google
      expect(setCookieHeaders(res)).toHaveLength(0);
    });

    it("never touches the real Google network (default stubs reject)", async () => {
      // beforeEach() installs blockGoogleNetwork(); a code exchange must fail loudly
      const res = await callback("code=real-looking-code");

      expect(res.status).toBe(500);
    });
  });

  describe("[FINDING] response behaviour", () => {
    it("answers with a JSON body instead of redirecting back to the frontend after success", async () => {
      stubGoogle();

      const res = await callback();

      expect(res.status).toBe(200);
      expect(res.headers.location).toBeUndefined();
      expect(res.headers["content-type"]).toMatch(/json/);
    });

    it("the callback endpoint has no rate limiter (unlike /google)", async () => {
      const res = await callback("error=access_denied");
      expect(Object.keys(res.headers).join(",").toLowerCase()).not.toMatch(/ratelimit/);
    });

    it("a Google-only account can still sign in with a password only if the password is known (random 16 char password)", async () => {
      stubGoogle();
      await callback();

      for (const guess of [VALID_PASSWORD, "Password@123", "Google@1234"]) {
        const res = await request(app).post("/api/auth/login").send({ email: "jane.doe@gmail.com", password: guess });
        expect(res.status).toBe(401);
      }
    });
  });
});
