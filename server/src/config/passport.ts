import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import findOrCreateGoogleUser from "../services/google-auth.service.js";
import config from "./config.js";


passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await findOrCreateGoogleUser(profile);
        return done(null, user);
      } catch (error) {
        return done(error as Error, false);
      }
    },
  ),
);


export default passport;