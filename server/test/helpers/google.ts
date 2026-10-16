import passport from "passport";

type Profile = {
  id: string;
  displayName?: string;
  emails?: { value: string; verified?: boolean }[];
  provider?: string;
};

type StubOptions = {
  profile?: Profile;
  /** make the code -> access-token exchange fail (simulates Google rejecting the code) */
  tokenError?: Error | { statusCode: number; data: string };
  /** make fetching the Google profile fail */
  profileError?: Error;
};

/**
 * Replaces the *network* parts of the real passport-google-oauth20 strategy that is
 * configured in src/config/passport.ts. Everything else (the strategy, the verify callback,
 * findOrCreateGoogleUser, the route + controller) is the real application code.
 */
const strategy = () => (passport as any)._strategy("google");

export const googleProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "google-uid-1",
  displayName: "Jane Doe",
  emails: [{ value: "jane.doe@gmail.com", verified: true }],
  provider: "google",
  ...overrides,
});

export const stubGoogle = (options: StubOptions = {}) => {
  const s = strategy();

  s._oauth2.getOAuthAccessToken = (_code: string, _params: unknown, cb: Function) => {
    if (options.tokenError) return cb(options.tokenError);
    return cb(null, "fake-access-token", "fake-refresh-token", {});
  };

  s.userProfile = (_accessToken: string, done: Function) => {
    if (options.profileError) return done(options.profileError);
    return done(null, options.profile ?? googleProfile());
  };
};

/** Default: any attempt to talk to Google fails loudly instead of using the network. */
export const blockGoogleNetwork = () => {
  const s = strategy();
  s._oauth2.getOAuthAccessToken = (_c: string, _p: unknown, cb: Function) =>
    cb(new Error("network access to Google is blocked in tests"));
  s.userProfile = (_t: string, done: Function) =>
    done(new Error("network access to Google is blocked in tests"));
};
