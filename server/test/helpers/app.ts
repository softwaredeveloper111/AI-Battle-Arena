import type { Express } from "express";

let appPromise: Promise<Express> | undefined;

/**
 * Lazily import the real Express app (src/app.ts) - never server.ts, so no port is bound,
 * no DB connection is opened by the app and no background worker is imported.
 * Importing lazily lets a test file pick its NODE_ENV first (see cookies.*.test.ts).
 */
export const getApp = (): Promise<Express> => {
  appPromise ??= (async () => {
    const { default: app } = await import("../../src/app.js");
    const { default: User } = await import("../../src/models/user.model.js");
    await User.init(); // make sure unique indexes exist before the first request
    return app;
  })();
  return appPromise;
};

export const getUserModel = async () => (await import("../../src/models/user.model.js")).default;

export const getRedis = async () => (await import("../../src/config/cache.js")).default as any;

export const getEmailQueue = async () => (await import("../../src/queues/email.queue.js")).default as any;
