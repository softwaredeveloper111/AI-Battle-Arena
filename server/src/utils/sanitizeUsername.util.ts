import crypto from "crypto";

/**
 * Formats and sanitizes a username to be compatible with User mongoose model:
 * - Lowercase letters, numbers, and underscores only: [a-z0-9_]
 * - Length between 3 and 20 characters
 *
 * @param rawUsername - Raw username or display name (e.g. from Google profile)
 * @returns Mongoose-compatible valid username
 */
export const sanitizeUsername = (rawUsername?: string | null): string => {
  if (!rawUsername) {
    return `user_${crypto.randomInt(1000, 9999)}`;
  }

  // Convert to lowercase and trim
  let username = rawUsername.trim().toLowerCase();

  // Replace spaces and dashes with underscores
  username = username.replace(/[\s-]+/g, "_");

  // Remove any character that is not a-z, 0-9, or _
  username = username.replace(/[^a-z0-9_]/g, "");

  // If length is less than 3, append random digits
  if (username.length < 3) {
    username = `${username}${crypto.randomInt(1000, 9999)}`;
  }

  // Ensure maximum length of 20 characters
  if (username.length > 20) {
    username = username.slice(0, 20);
  }

  return username;
};

export default sanitizeUsername;
