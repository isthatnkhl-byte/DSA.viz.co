import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_FILE = path.join(process.cwd(), '.data', 'backend-cache.json');

// Initialize local file cache if present
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const now = Date.now();
    for (const [k, v] of Object.entries(parsed)) {
      const entry = v as CacheEntry;
      if (entry && entry.expiresAt > now) {
        MEMORY_CACHE.set(k, entry);
      }
    }
  }
} catch (e) {
  // Graceful fallback if file corrupted
}

function persistMemoryCache() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const now = Date.now();
    const dataToSave: Record<string, CacheEntry> = {};
    for (const [k, v] of MEMORY_CACHE.entries()) {
      if (v.expiresAt > now) {
        dataToSave[k] = v;
      }
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(dataToSave), 'utf-8');
  } catch (e) {
    // Non-blocking disk warning
  }
}

// Optional Redis Client
let redisClient: Redis | null = null;
let isConnectedToRedis = false;

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDISCLOUD_URL;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying quickly to avoid log spam
        return Math.min(times * 100, 1000);
      },
    });

    redisClient.on('connect', () => {
      isConnectedToRedis = true;
      console.log('✅ [Redis] Connected successfully to Redis backend cache.');
    });

    redisClient.on('error', () => {
      isConnectedToRedis = false;
    });

    redisClient.on('close', () => {
      isConnectedToRedis = false;
    });

    redisClient.connect().catch(() => {
      isConnectedToRedis = false;
    });
  } catch (err) {
    redisClient = null;
    isConnectedToRedis = false;
  }
}

/**
 * Retrieve cached value by key. Checks Redis first (if available), then memory/disk.
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  if (redisClient && isConnectedToRedis) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        try {
          return JSON.parse(data) as T;
        } catch {
          return data as unknown as T;
        }
      }
    } catch {
      // Fallback to memory
    }
  }

  const entry = MEMORY_CACHE.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return entry.value as T;
}

/**
 * Set a key with TTL (default 1800s / 30 mins). Writes to Redis (if available) and memory/disk.
 */
export async function setCache(key: string, value: any, ttlSeconds: number = 1800): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  MEMORY_CACHE.set(key, { value, expiresAt });
  persistMemoryCache();

  if (redisClient && isConnectedToRedis) {
    try {
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      await redisClient.set(key, str, 'EX', ttlSeconds);
    } catch {
      // Memory already updated
    }
  }
}

/**
 * Invalidate a cached key.
 */
export async function deleteCache(key: string): Promise<void> {
  MEMORY_CACHE.delete(key);
  persistMemoryCache();

  if (redisClient && isConnectedToRedis) {
    try {
      await redisClient.del(key);
    } catch {
      // Ignored
    }
  }
}

/**
 * Invalidate multiple keys matching a prefix or pattern.
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const regex = new RegExp(`^${pattern.replace('*', '.*')}`);
  for (const k of MEMORY_CACHE.keys()) {
    if (regex.test(k)) {
      MEMORY_CACHE.delete(k);
    }
  }
  persistMemoryCache();

  if (redisClient && isConnectedToRedis) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch {
      // Ignored
    }
  }
}

export function isRedisConnected(): boolean {
  return isConnectedToRedis;
}

export function getCacheStatus() {
  return {
    redisConnected: isConnectedToRedis,
    mode: isConnectedToRedis ? ('redis' as const) : ('memory+disk' as const),
    cachedItemsCount: MEMORY_CACHE.size,
  };
}
