/**
 * Test double for the `rate-limit-redis` package.
 *
 * The real express-rate-limit middleware (limits, windows, 429 bodies) is still exercised;
 * only its *storage* is swapped for process memory so no Redis server / Lua scripting is
 * needed. Stores register themselves so tests can reset them between cases.
 */
type Hit = { totalHits: number; resetTime: Date };

const registry: RedisStore[] = [];

export class RedisStore {
  readonly prefix: string;
  private windowMs = 15 * 60 * 1000;
  private hits = new Map<string, Hit>();

  constructor(options: { prefix?: string } = {}) {
    this.prefix = options.prefix ?? "rl:";
    registry.push(this);
  }

  init(options: { windowMs: number }) {
    this.windowMs = options.windowMs;
  }

  private current(key: string): Hit | undefined {
    const hit = this.hits.get(key);
    if (hit && hit.resetTime.getTime() <= Date.now()) {
      this.hits.delete(key);
      return undefined;
    }
    return hit;
  }

  async get(key: string) {
    return this.current(key);
  }

  async increment(key: string): Promise<Hit> {
    const existing = this.current(key);
    if (existing) {
      existing.totalHits += 1;
      return { ...existing };
    }
    const fresh: Hit = {
      totalHits: 1,
      resetTime: new Date(Date.now() + this.windowMs),
    };
    this.hits.set(key, fresh);
    return { ...fresh };
  }

  async decrement(key: string) {
    const hit = this.current(key);
    if (hit) hit.totalHits = Math.max(0, hit.totalHits - 1);
  }

  async resetKey(key: string) {
    this.hits.delete(key);
  }

  async resetAll() {
    this.hits.clear();
  }
}

/** Clear every limiter (call between tests). */
export const resetRateLimitStores = () => {
  for (const store of registry) store.resetAll();
};

/** Clear one limiter by its key prefix, e.g. "resend-email-rate-limit:". */
export const resetRateLimitStore = (prefix: string) => {
  for (const store of registry) {
    if (store.prefix === prefix) store.resetAll();
  }
};

export const RATE_LIMIT_PREFIX = {
  global: "global-rate-limit:",
  auth: "auth-rate-limit:",
  resetPassword: "reset-password-rate-limit:",
  resendEmailIp: "resend-email-rate-limit:",
  emailKey: "email-rate-limit:",
} as const;
