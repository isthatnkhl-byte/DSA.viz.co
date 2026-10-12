import fs from 'fs';
import path from 'path';
import { adminDb, isAdminDbAvailable, markAdminDbUnavailable } from '../lib/firebase-admin';
import { getCache, setCache, deleteCache } from '../lib/redis-cache';

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', '.data') : path.join(process.cwd(), '.data');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');
const MAX_PROFILES_IN_MEMORY = 5000;
const memoryProfileStore = new Map<string, any>();

function setMemoryProfile(userId: string, data: any) {
  if (!memoryProfileStore.has(userId) && memoryProfileStore.size >= MAX_PROFILES_IN_MEMORY) {
    const oldest = memoryProfileStore.keys().next().value;
    if (oldest) memoryProfileStore.delete(oldest);
  }
  memoryProfileStore.set(userId, data);
}

// Load persistent profiles if present
try {
  if (fs.existsSync(PROFILES_FILE)) {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      setMemoryProfile(k, v);
    }
  }
} catch {
  // Silent fallback
}

let persistProfilesTimer: ReturnType<typeof setTimeout> | null = null;
let isPersistingProfiles = false;

function persistProfiles() {
  if (persistProfilesTimer) return;
  persistProfilesTimer = setTimeout(async () => {
    persistProfilesTimer = null;
    if (isPersistingProfiles) return;
    isPersistingProfiles = true;
    try {
      const dir = path.dirname(PROFILES_FILE);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const obj: Record<string, any> = {};
      for (const [k, v] of memoryProfileStore.entries()) {
        obj[k] = v;
      }
      await fs.promises.writeFile(PROFILES_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // Non-blocking disk persist fallback
    } finally {
      isPersistingProfiles = false;
    }
  }, 500);
  if (typeof persistProfilesTimer.unref === 'function') {
    persistProfilesTimer.unref();
  }
}

export async function getProfile(userId: string) {
  if (!userId) return null;

  // 1. Check unified Redis cache first
  try {
    const cached = (await getCache<any>(`profile:v2:${userId}`)) ?? (await getCache<any>(`profile:${userId}`));
    if (cached) return cached;
  } catch {
    // Fall through
  }

  // 2. Check Firestore ONLY if configured with service account credentials
  if (isAdminDbAvailable()) {
    try {
      const doc = await adminDb.collection('users').doc(userId).get();
      if (doc && doc.exists) {
        const data = doc.data();
        const existing = memoryProfileStore.get(userId) || {};
        const merged = { ...existing, ...data };
        setMemoryProfile(userId, merged);
        persistProfiles();
        await setCache(`profile:v2:${userId}`, merged).catch(() => {});
        return merged;
      }
    } catch {
      markAdminDbUnavailable();
    }
  }

  // 3. Fall back to local store
  const local = memoryProfileStore.get(userId) || null;
  if (local) {
    await setCache(`profile:v2:${userId}`, local).catch(() => {});
  }
  return local;
}

export async function updateProfile(userId: string, data: any) {
  if (!userId) return null;

  const existing = memoryProfileStore.get(userId) || {};
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  setMemoryProfile(userId, merged);
  persistProfiles();

  // Write through to unified Redis cache
  await setCache(`profile:v2:${userId}`, merged).catch(() => {});

  if (isAdminDbAvailable()) {
    try {
      await adminDb.collection('users').doc(userId).set(data, { merge: true });
      const doc = await adminDb.collection('users').doc(userId).get();
      if (doc && doc.exists) {
        const cloudData = { ...doc.data(), ...merged, ...data };
        setMemoryProfile(userId, cloudData);
        persistProfiles();
        await setCache(`profile:v2:${userId}`, cloudData).catch(() => {});
        return cloudData;
      }
    } catch {
      markAdminDbUnavailable();
    }
  }

  return merged;
}

export async function clearProfileCache(userId: string) {
  if (!userId) return;
  await Promise.all([
    deleteCache(`profile:v2:${userId}`).catch(() => {}),
    deleteCache(`profile:${userId}`).catch(() => {}),
  ]);
}


