import fs from 'fs';
import path from 'path';
import { adminDb } from '../lib/firebase-admin';
import { getCache, setCache, deleteCache } from '../lib/redis-cache';

const PROFILES_FILE = path.join(process.cwd(), '.data', 'profiles.json');
const memoryProfileStore = new Map<string, any>();

// Load persistent profiles if present
try {
  if (fs.existsSync(PROFILES_FILE)) {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      memoryProfileStore.set(k, v);
    }
  }
} catch {
  // Silent fallback
}

function persistProfiles() {
  try {
    const dir = path.dirname(PROFILES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, any> = {};
    for (const [k, v] of memoryProfileStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Non-blocking disk persist fallback
  }
}

export async function getProfile(userId: string) {
  if (!userId) return null;

  // 1. Check Redis cache first
  try {
    const cached = await getCache<any>(`profile:${userId}`);
    if (cached) return cached;
  } catch {
    // Fall through
  }

  // 2. Check Firestore if configured with credentials
  try {
    const doc = await adminDb.collection('users').doc(userId).get();
    if (doc && doc.exists) {
      const data = doc.data();
      const existing = memoryProfileStore.get(userId) || {};
      const merged = { ...existing, ...data };
      memoryProfileStore.set(userId, merged);
      persistProfiles();
      await setCache(`profile:${userId}`, merged, 1800).catch(() => {});
      return merged;
    }
  } catch {
    // Admin DB credentials not present or network unavailable
  }

  // 3. Fall back to local store
  const local = memoryProfileStore.get(userId) || null;
  if (local) {
    await setCache(`profile:${userId}`, local, 1800).catch(() => {});
  }
  return local;
}

export async function updateProfile(userId: string, data: any) {
  if (!userId) return null;

  const existing = memoryProfileStore.get(userId) || {};
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  memoryProfileStore.set(userId, merged);
  persistProfiles();

  // Write through to Redis cache
  await setCache(`profile:${userId}`, merged, 1800).catch(() => {});

  try {
    await adminDb.collection('users').doc(userId).set(data, { merge: true });
    const doc = await adminDb.collection('users').doc(userId).get();
    if (doc && doc.exists) {
      const cloudData = { ...merged, ...doc.data() };
      memoryProfileStore.set(userId, cloudData);
      persistProfiles();
      await setCache(`profile:${userId}`, cloudData, 1800).catch(() => {});
      return cloudData;
    }
  } catch {
    // Fall back gracefully to memory/disk store
  }

  return merged;
}

export async function clearProfileCache(userId: string) {
  if (!userId) return;
  await deleteCache(`profile:${userId}`).catch(() => {});
}

