import { vi, beforeAll, afterAll, beforeEach, afterEach, inject } from "vitest";
import mongoose from "mongoose";
import redisClient from "../src/config/cache.js";
import emailQueue from "../src/queues/email.queue.js";
import { resetRateLimitStores } from "./helpers/inMemoryRateLimitStore";
import { NEVER_CONNECT_MONGO_URI, NEVER_CONNECT_REDIS_URL } from "./helpers/testEnv";

/**
 * ---------------------------------------------------------------------------------
 *  External-service isolation (applies to EVERY test file)
 *  NOTE: this file must never import `src/config/config.ts` (directly or indirectly),
 *  so that individual test files may still choose a NODE_ENV before the app loads.
 * ---------------------------------------------------------------------------------
 */

// Redis -> in-memory fake (also used by the rate limiters through rate-limit-redis).
vi.mock("../src/config/cache.js", async () => {
  const { createFakeRedis } = await import("./helpers/fakeRedis");
  return { default: createFakeRedis() };
});

// Rate limiting stays real, only its Redis-backed storage is swapped for memory.
vi.mock("rate-limit-redis", async () => await import("./helpers/inMemoryRateLimitStore"));

// BullMQ queue -> no Redis connection, no jobs are ever processed.
vi.mock("../src/queues/email.queue.js", () => ({
  default: { add: vi.fn() },
}));

// Resend (the e-mail provider) -> never reaches the network.
vi.mock("../src/services/email.service.js", () => ({
  default: vi.fn(),
}));

// Silent logger (avoids spawning the pino-pretty worker thread).
vi.mock("../src/lib/logger.js", async () => {
  const { default: pino } = await import("pino");
  return { default: pino({ level: "silent" }) };
});

const fakeRedis = redisClient as unknown as ReturnType<
  typeof import("./helpers/fakeRedis").createFakeRedis
>;
const queueAdd = emailQueue.add as unknown as ReturnType<typeof vi.fn>;

const resetQueue = () => {
  queueAdd.mockReset();
  queueAdd.mockImplementation(async (name: string) => ({ id: `job-${name}` }));
};

beforeAll(async () => {
  // Hard safety net: refuse to run if anything points at a real service.
  if (
    process.env.MONGO_URI !== NEVER_CONNECT_MONGO_URI ||
    process.env.REDIS_URL !== NEVER_CONNECT_REDIS_URL
  ) {
    throw new Error(
      "Refusing to run tests: MONGO_URI / REDIS_URL are not the test sentinels. " +
        "Run the suite through vitest.config.ts.",
    );
  }

  const dbName = `auth_test_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await mongoose.connect(inject("mongoUri"), { dbName });
});

beforeEach(async () => {
  fakeRedis.__reset();
  resetQueue();
  resetRateLimitStores();

  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
