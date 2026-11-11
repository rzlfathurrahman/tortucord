import { Redis } from 'ioredis';

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

/**
 * Robust Redis client singleton with seamless in-memory fallback.
 * Guarantees zero downtime even if Redis is unreachable or during local dev.
 */
class RedisService {
  private client: Redis | null = null;
  private memoryStore = new Map<string, MemoryEntry>();
  private connected = false;
  private warnedOnce = false;

  constructor() {
    const url = process.env.REDIS_URL;

    if (url) {
      try {
        this.client = new Redis(url, {
          maxRetriesPerRequest: 2,
          connectTimeout: 3000,
          lazyConnect: false,
          enableOfflineQueue: false,
          retryStrategy: (times) => {
            if (times > 3) {
              if (!this.warnedOnce) {
                console.warn('[Redis] Connection failed. Switching seamlessly to in-memory fallback.');
                this.warnedOnce = true;
              }
              return null; // Stop retrying
            }
            return Math.min(times * 500, 2000);
          },
        });

        this.client.on('connect', () => {
          this.connected = true;
        });

        this.client.on('error', (err) => {
          this.connected = false;
          if (!this.warnedOnce) {
            console.warn(`[Redis] Connection warning: ${err.message}. Running in in-memory fallback mode.`);
            this.warnedOnce = true;
          }
        });
      } catch (err) {
        console.warn('[Redis] Failed to initialize client, using in-memory store.', err);
        this.client = null;
      }
    }

    // Periodically clean expired keys from in-memory fallback every minute
    if (typeof setInterval !== 'undefined') {
      const timer = setInterval(() => this.cleanupMemoryStore(), 60_000);
      if (timer && typeof timer.unref === 'function') {
        timer.unref();
      }
    }
  }

  public isReady(): boolean {
    return this.connected && this.client !== null && this.client.status === 'ready';
  }

  private cleanupMemoryStore(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  public async get(key: string): Promise<string | null> {
    if (this.isReady() && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // Fallback to memory
      }
    }

    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  public async set(key: string, value: string): Promise<void> {
    if (this.isReady() && this.client) {
      try {
        await this.client.set(key, value);
        return;
      } catch {
        // Fallback to memory
      }
    }

    this.memoryStore.set(key, { value, expiresAt: null });
  }

  public async setex(key: string, seconds: number, value: string): Promise<void> {
    if (this.isReady() && this.client) {
      try {
        await this.client.setex(key, seconds, value);
        return;
      } catch {
        // Fallback to memory
      }
    }

    const expiresAt = Date.now() + seconds * 1000;
    this.memoryStore.set(key, { value, expiresAt });
  }

  public async del(key: string): Promise<void> {
    if (this.isReady() && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch {
        // Fallback to memory
      }
    }

    this.memoryStore.delete(key);
  }

  public async incr(key: string): Promise<number> {
    if (this.isReady() && this.client) {
      try {
        return await this.client.incr(key);
      } catch {
        // Fallback to memory
      }
    }

    const current = await this.get(key);
    const newVal = (parseInt(current ?? '0', 10) || 0) + 1;
    await this.set(key, newVal.toString());
    return newVal;
  }

  public async expire(key: string, seconds: number): Promise<boolean> {
    if (this.isReady() && this.client) {
      try {
        const res = await this.client.expire(key, seconds);
        return res === 1;
      } catch {
        // Fallback to memory
      }
    }

    const entry = this.memoryStore.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
      return true;
    }
    return false;
  }

  public async ttl(key: string): Promise<number> {
    if (this.isReady() && this.client) {
      try {
        return await this.client.ttl(key);
      } catch {
        // Fallback to memory
      }
    }

    const entry = this.memoryStore.get(key);
    if (!entry || !entry.expiresAt) return -1;
    const remaining = Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
    return remaining;
  }

  /**
   * Atomic sliding window rate limiter
   * Returns { allowed: boolean, remaining: number, reset: number, retryAfter: number }
   */
  public async rateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    reset: number;
    retryAfter: number;
  }> {
    const now = Math.floor(Date.now() / 1000);

    if (this.isReady() && this.client) {
      try {
        const pipeline = this.client.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);
        const results = await pipeline.exec();

        if (results && results[0] && results[1]) {
          const count = (results[0][1] as number) || 1;
          let currentTtl = (results[1][1] as number) || -1;

          if (currentTtl === -1) {
            await this.client.expire(key, windowSeconds);
            currentTtl = windowSeconds;
          }

          const allowed = count <= limit;
          const remaining = Math.max(0, limit - count);
          const reset = now + Math.max(1, currentTtl);
          const retryAfter = allowed ? 0 : Math.max(1, currentTtl);

          return { allowed, limit, remaining, reset, retryAfter };
        }
      } catch {
        // Fallback to memory
      }
    }

    // In-memory fallback
    const entry = this.memoryStore.get(key);
    let count = 1;
    let expiresAt = Date.now() + windowSeconds * 1000;

    if (entry && entry.expiresAt && entry.expiresAt > Date.now()) {
      count = (parseInt(entry.value, 10) || 0) + 1;
      expiresAt = entry.expiresAt;
      this.memoryStore.set(key, { value: count.toString(), expiresAt });
    } else {
      this.memoryStore.set(key, { value: '1', expiresAt });
    }

    const currentTtl = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const reset = now + currentTtl;
    const retryAfter = allowed ? 0 : currentTtl;

    return { allowed, limit, remaining, reset, retryAfter };
  }

  /**
   * Acquire a distributed lock with TTL
   */
  public async acquireLock(lockKey: string, ttlSeconds = 5): Promise<boolean> {
    if (this.isReady() && this.client) {
      try {
        const result = await this.client.set(lockKey, 'locked', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch {
        // Fallback to memory
      }
    }

    const existing = this.memoryStore.get(lockKey);
    const now = Date.now();
    if (existing && (!existing.expiresAt || existing.expiresAt > now)) {
      return false;
    }

    this.memoryStore.set(lockKey, {
      value: 'locked',
      expiresAt: now + ttlSeconds * 1000,
    });
    return true;
  }

  public async releaseLock(lockKey: string): Promise<void> {
    await this.del(lockKey);
  }
}

// Global singleton for Next.js hot reload support
const globalForRedis = globalThis as unknown as {
  tortugaRedisClient?: RedisService;
};

export const redis = globalForRedis.tortugaRedisClient ?? new RedisService();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.tortugaRedisClient = redis;
}
