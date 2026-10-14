import { z } from "zod";

/**
 * Reusable field validators strictly aligned with user.model.ts schema:
 * - username: 3-20 chars, lowercase, regex: ^[a-z0-9_]{3,20}$
 * - email: valid email format, trimmed, lowercase
 * - password: 6-32 chars, at least 1 lowercase, 1 uppercase, 1 number, 1 special char (@$!%*?&)
 */
const usernameSchema = z
  .string({ error: "username is required" })
  .trim()
  .toLowerCase()
  .min(3, "username must be atleast 3 characters long")
  .max(20, "username must be at most 20 characters long")
  .regex(/^[a-z0-9_]{3,20}$/, "please provide a valid username");

const emailSchema = z
  .string({ error: "email is required" })
  .trim()
  .toLowerCase()
  .min(1, "email is required")
  .email("Please enter a valid email address");

const strongPasswordSchema = z
  .string({ error: "password is required" })
  .min(6, "password must be atleast 6 characters long")
  .max(32, "password must be at most 32 characters long")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,32}$/,
    "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
  );

/**
 * POST /api/auth/register
 */
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
});

/**
 * POST /api/auth/login
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "password is required" })
    .min(1, "password is required"),
});

/**
 * POST /api/auth/resend-verification-link
 */
export const resendVerificationLinkSchema = z.object({
  email: emailSchema,
});

/**
 * POST /api/auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * POST /api/auth/reset-password
 */
export const resetPasswordSchema = z.object({
  token: z
    .string({ error: "token is required" })
    .trim()
    .min(1, "token is required"),
  password: strongPasswordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResendVerificationLinkInput = z.infer<typeof resendVerificationLinkSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
