import crypto from "crypto";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";
const SPECIAL_CHARS = "@$!%*?&";
const ALL_CHARS = `${LOWERCASE}${UPPERCASE}${NUMBERS}${SPECIAL_CHARS}`;

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,32}$/;

/**
 * Generates a cryptographically secure random password that satisfies
 * the User mongoose model validation:
 * - Length between 6 and 32 characters (default: 16)
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character from (@$!%*?&)
 * - Only contains characters from [A-Za-z\\d@$!%*?&]
 *
 * @param length - Desired password length (must be between 6 and 32, defaults to 16)
 * @returns A cryptographically secure valid password string
 */
export const generatePassword = (length: number = 16): string => {
  if (length < 6 || length > 32) {
    throw new RangeError("Password length must be between 6 and 32 characters.");
  }

  const getRandomChar = (charset: string): string => {
    const index = crypto.randomInt(0, charset.length);
    const char = charset[index];
    if (!char) {
      throw new Error("Unable to select character from charset");
    }
    return char;
  };

  // Guarantee at least one character from each required category
  const passwordChars: string[] = [
    getRandomChar(LOWERCASE),
    getRandomChar(UPPERCASE),
    getRandomChar(NUMBERS),
    getRandomChar(SPECIAL_CHARS),
  ];

  // Fill remaining characters from all allowed characters
  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(getRandomChar(ALL_CHARS));
  }

  // Fisher-Yates shuffle using cryptographically secure random integers
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = passwordChars[i]!;
    passwordChars[i] = passwordChars[j]!;
    passwordChars[j] = temp;
  }

  const password = passwordChars.join("");

  // Validate against mongoose password regex as an extra safety guarantee
  if (!PASSWORD_REGEX.test(password)) {
    return generatePassword(length);
  }

  return password;
};

export default generatePassword;
