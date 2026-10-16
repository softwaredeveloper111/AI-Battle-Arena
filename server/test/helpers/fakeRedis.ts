import { vi } from "vitest";

type Entry = { value: string; expiresAt: number | null };

/**
 * Minimal in-memory stand-in for the ioredis client exported from src/config/cache.ts.
 * It implements only what the authentication code uses (get / set with EX / del), plus
 * `ttl`, and every method is a vi.fn so tests can assert calls or inject failures.
 */
export function createFakeRedis() {
  const store = new Map<string, Entry>();

  const readEntry = (key: string): Entry | undefined => {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    return entry;
  };

  const impl = {
    get: async (key: string) => readEntry(key)?.value ?? null,

    set: async (key: string, value: string, ...args: unknown[]) => {
      let expiresAt: number | null = null;
      const exIndex = args.findIndex((a) => String(a).toUpperCase() === "EX");
      if (exIndex !== -1) {
        expiresAt = Date.now() + Number(args[exIndex + 1]) * 1000;
      }
      store.set(key, { value: String(value), expiresAt });
      return "OK";
    },

    del: async (...keys: string[]) => {
      let removed = 0;
      for (const key of keys) {
        if (store.delete(key)) removed++;
      }
      return removed;
    },

    ttl: async (key: string) => {
      const entry = readEntry(key);
      if (!entry) return -2;
      if (entry.expiresAt === null) return -1;
      return Math.ceil((entry.expiresAt - Date.now()) / 1000);
    },

    on: () => undefined,
  };

  const client = {
    get: vi.fn(impl.get),
    set: vi.fn(impl.set),
    del: vi.fn(impl.del),
    ttl: vi.fn(impl.ttl),
    on: vi.fn(impl.on),

    /** wipe data and restore the default (working) implementations */
    __reset() {
      store.clear();
      client.get.mockReset().mockImplementation(impl.get);
      client.set.mockReset().mockImplementation(impl.set);
      client.del.mockReset().mockImplementation(impl.del);
      client.ttl.mockReset().mockImplementation(impl.ttl);
    },

    /** raw view for assertions */
    __keys: () => [...store.keys()].filter((k) => readEntry(k)),
  };

  return client;
}

export type FakeRedis = ReturnType<typeof createFakeRedis>;
