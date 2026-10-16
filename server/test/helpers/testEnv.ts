/**
 * Test-only environment variables.
 *
 * These are injected through `test.env` in vitest.config.ts, *before* any application
 * module is loaded. `src/config/config.ts` calls `import "dotenv/config"`, which never
 * overrides variables that are already present, so the real `.env` file (which may point
 * at production services) can never leak into the test run.
 *
 * MONGO_URI and REDIS_URL deliberately point at an unroutable port: the tests use
 * mongodb-memory-server and an in-memory Redis fake, so nothing should ever dial them.
 * `test/setup.ts` asserts that these sentinel values are in place.
 */
export const NEVER_CONNECT_MONGO_URI = "mongodb://127.0.0.1:1/__never_connect__";
export const NEVER_CONNECT_REDIS_URL = "redis://127.0.0.1:1";

export const TEST_ENV: Record<string, string> = {
  NODE_ENV: "test",
  PORT: "5999",
  LOG_LEVEL: "silent",
  GEMINI_API_KEY: "test-gemini-key",
  MISTRAL_API_KEY: "test-mistral-key",
  COHERE_API_KEY: "test-cohere-key",
  BCRYPT_SALT_ROUNDS: "4",
  JWT_SECRET_KEY: "test-jwt-secret-key-0123456789",
  EMAIL_VERIFICATION_SECRET_KEY: "test-email-verification-secret-0123456789",
  RESET_PASSWORD_SECRET_KEY: "test-reset-password-secret-0123456789",
  MONGO_URI: NEVER_CONNECT_MONGO_URI,
  REDIS_URL: NEVER_CONNECT_REDIS_URL,
  RESEND_API_KEY: "re_test_dummy_key",
  FRONTEND_URL: "http://frontend.test",
  BACKEND_URL: "http://backend.test",
  GOOGLE_CLIENT_ID: "test-google-client-id",
  GOOGLE_CLIENT_SECRET: "test-google-client-secret",
  GOOGLE_CALLBACK_URL: "http://backend.test/api/auth/google/callback",
};
