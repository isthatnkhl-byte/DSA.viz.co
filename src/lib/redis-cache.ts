import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry>();
const MAX_MEMORY_CACHE_ENTRIES = 1000;
const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', '.data')
  : path.join(process.cwd(), '.data');
const CACHE_FILE = path.join(DATA_DIR, 'backend-cache.json');
const DEFAULT_RETENTION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days (retained until explicit resync/mutation)

function setMemoryCacheBounded(key: string, entry: CacheEntry): void {
  if (MEMORY_CACHE.has(key)) {
    MEMORY_CACHE.delete(key);
  } else if (MEMORY_CACHE.size >= MAX_MEMORY_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of MEMORY_CACHE.entries()) {
      if (v.expiresAt <= now) {
        MEMORY_CACHE.delete(k);
      }
    }
    while (MEMORY_CACHE.size >= MAX_MEMORY_CACHE_ENTRIES) {
      const oldestKey = MEMORY_CACHE.keys().next().value;
      if (!oldestKey) break;
      MEMORY_CACHE.delete(oldestKey);
    }
  }
  MEMORY_CACHE.set(key, entry);
}

// Initialize local file cache if present
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const now = Date.now();
    for (const [k, v] of Object.entries(parsed)) {
      const entry = v as CacheEntry;
      if (entry && entry.expiresAt > now) {
        setMemoryCacheBounded(k, entry);
      }
    }
  }
} catch (e) {
  // Graceful fallback if file corrupted
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let isPersisting = false;

function persistMemoryCache() {
  if (persistTimer) return;
  persistTimer = setTimeout(async () => {
    persistTimer = null;
    if (isPersisting) return;
    isPersisting = true;
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const now = Date.now();
      const dataToSave: Record<string, CacheEntry> = {};
      for (const [k, v] of MEMORY_CACHE.entries()) {
        if (v.expiresAt > now) {
          dataToSave[k] = v;
        }
      }
      await fs.promises.writeFile(CACHE_FILE, JSON.stringify(dataToSave), 'utf-8');
    } catch {
      // Non-blocking disk warning
    } finally {
      isPersisting = false;
    }
  }, 500);
  if (typeof persistTimer.unref === 'function') {
    persistTimer.unref();
  }
}

// Optional Redis Client
let redisClient: Redis | null = null;
let isConnectedToRedis = false;

const rawRedisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL || process.env.REDISCLOUD_URL;
const REDIS_URL = rawRedisUrl?.trim().replace(/^["']|["']$/g, "").trim();

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
 * Retrieve cached value by key. Checks L1 memory first for 0ms reads, then Redis, then disk.
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  const memEntry = MEMORY_CACHE.get(key);
  if (memEntry) {
    if (memEntry.expiresAt > Date.now()) {
      // Refresh LRU ordering
      MEMORY_CACHE.delete(key);
      MEMORY_CACHE.set(key, memEntry);
      return memEntry.value as T;
    }
    MEMORY_CACHE.delete(key);
  }

  if (redisClient && isConnectedToRedis) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        let parsedVal: T;
        try {
          parsedVal = JSON.parse(data) as T;
        } catch {
          parsedVal = data as unknown as T;
        }
        setMemoryCacheBounded(key, {
          value: parsedVal,
          expiresAt: Date.now() + DEFAULT_RETENTION_TTL_SECONDS * 1000,
        });
        return parsedVal;
      }
    } catch {
      // Fallback to memory
    }
  }

  return null;
}

/**
 * Set a key with TTL (default 7 days). Writes to L1 memory/disk and Redis (if available).
 */
export async function setCache(
  key: string,
  value: any,
  ttlSeconds: number = DEFAULT_RETENTION_TTL_SECONDS
): Promise<void> {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  setMemoryCacheBounded(key, { value, expiresAt });
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
 * Invalidate multiple keys matching a prefix or pattern using non-blocking SCAN.
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  const regex = new RegExp(`^${escaped}$`);
  for (const k of MEMORY_CACHE.keys()) {
    if (regex.test(k)) {
      MEMORY_CACHE.delete(k);
    }
  }
  persistMemoryCache();

  if (redisClient && isConnectedToRedis) {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (Array.isArray(keys) && keys.length > 0) {
          await redisClient.del(...keys);
        }
      } while (cursor !== '0');
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
