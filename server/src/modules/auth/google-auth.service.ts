import userModel, { type IUser } from "./user.model.js";
import generatePassword from "../../shared/utils/generatePassword.util.js";
import sanitizeUsername from "../../shared/utils/sanitizeUsername.util.js";
import type { Profile } from "passport-google-oauth20";

const findOrCreateGoogleUser = async (profile: Profile): Promise<IUser> => {
  const email = profile.emails?.[0]?.value;
  const username = sanitizeUsername(profile.displayName);

  if (!email) {
    throw new Error("Google account email is unavailable");
  }

  let existingUser = await userModel.findOne({ email });
  if (existingUser) {
    if (!existingUser.emailVerified) {
      existingUser.emailVerified = true;
      await existingUser.save();
    }

    return existingUser;
  }

  const user = await userModel.create({
    username,
    email,
    password: generatePassword(),
    emailVerified: true,
  });

  return user;
};

export default findOrCreateGoogleUser;
