import { Redis } from "ioredis";
import { logger } from "./logger.js";

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

/**
 * Robust Redis wrapper with graceful in-memory fallback.
 * Guarantees zero downtime if Redis is disconnected or not configured.
 */
export class RedisService {
  private client: Redis | null = null;
  private memoryStore = new Map<string, MemoryEntry>();
  private connected = false;
  private warnedOnce = false;

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL;

    if (url) {
      try {
        this.client = new Redis(url, {
          maxRetriesPerRequest: 1,
          connectTimeout: 4000,
          lazyConnect: true,
          enableOfflineQueue: false,
          retryStrategy: (times) => {
            if (times > 3) {
              if (!this.warnedOnce) {
                logger.warn("Redis connection failed. Switching seamlessly to in-memory cache fallback.");
                this.warnedOnce = true;
              }
              return null; // Stop retrying
            }
            return Math.min(times * 1000, 3000);
          },
        });

        this.client.on("connect", () => {
          this.connected = true;
          logger.success("Connected to Redis cache server successfully.");
        });

        this.client.on("error", (err) => {
          this.connected = false;
          if (!this.warnedOnce) {
            logger.warn(`Redis notice: ${err.message}. Operating in in-memory fallback mode.`);
            this.warnedOnce = true;
          }
        });
      } catch (err) {
        logger.warn("Failed to instantiate Redis client, using in-memory store.", err);
        this.client = null;
      }
    } else {
      logger.info("No REDIS_URL provided. Using high-performance in-memory cache.");
    }

    // Clean expired keys from memory store every minute
    setInterval(() => this.cleanupMemoryStore(), 60_000).unref();
  }

  public async init(): Promise<void> {
    if (this.client) {
      try {
        await this.client.connect();
      } catch (err) {
        this.connected = false;
        if (!this.warnedOnce) {
          logger.warn("Redis unreachable at startup. Using in-memory fallback cache.");
          this.warnedOnce = true;
        }
      }
    }
  }

  public isReady(): boolean {
    return this.connected && this.client !== null && this.client.status === "ready";
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
    const newVal = (parseInt(current ?? "0", 10) || 0) + 1;
    await this.set(key, newVal.toString());
    return newVal;
  }

  /**
   * Acquire a distributed lock with TTL.
   * Returns true if lock was acquired, false if already held.
   */
  public async acquireLock(lockKey: string, ttlSeconds = 5): Promise<boolean> {
    if (this.isReady() && this.client) {
      try {
        const result = await this.client.set(lockKey, "locked", "EX", ttlSeconds, "NX");
        return result === "OK";
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
      value: "locked",
      expiresAt: now + ttlSeconds * 1000,
    });
    return true;
  }

  /**
   * Release an acquired lock.
   */
  public async releaseLock(lockKey: string): Promise<void> {
    await this.del(lockKey);
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
    }
    this.memoryStore.clear();
  }
}
