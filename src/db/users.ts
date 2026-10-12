import fs from 'fs';
import path from 'path';
import { adminDb, isAdminDbAvailable, markAdminDbUnavailable } from '../lib/firebase-admin';
import { getCache, setCache } from '../lib/redis-cache';

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', '.data') : path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const MAX_USERS_IN_MEMORY = 5000;
const memoryUserStore = new Map<string, any>();

function setMemoryUser(uid: string, data: any) {
  if (!memoryUserStore.has(uid) && memoryUserStore.size >= MAX_USERS_IN_MEMORY) {
    const oldest = memoryUserStore.keys().next().value;
    if (oldest) memoryUserStore.delete(oldest);
  }
  memoryUserStore.set(uid, data);
}

// Load persistent users if present
try {
  if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      setMemoryUser(k, v);
    }
  }
} catch {
  // Silent fallback
}

let persistUsersTimer: ReturnType<typeof setTimeout> | null = null;
let isPersistingUsers = false;

function persistUsers() {
  if (persistUsersTimer) return;
  persistUsersTimer = setTimeout(async () => {
    persistUsersTimer = null;
    if (isPersistingUsers) return;
    isPersistingUsers = true;
    try {
      const dir = path.dirname(USERS_FILE);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const obj: Record<string, any> = {};
      for (const [k, v] of memoryUserStore.entries()) {
        obj[k] = v;
      }
      await fs.promises.writeFile(USERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // Non-blocking fallback
    } finally {
      isPersistingUsers = false;
    }
  }, 500);
  if (typeof persistUsersTimer.unref === 'function') {
    persistUsersTimer.unref();
  }
}

export async function getOrCreateUser(uid: string, email: string) {
  if (!uid) return null;

  const defaultUsername = email ? email.split('@')[0] : `user_${uid.slice(0, 6)}`;

  // 1. Check Redis cache first
  try {
    const cached = await getCache<any>(`user:${uid}`);
    if (cached) return cached;
  } catch {
    // Fall through
  }
  
  // 2. Try Firestore ONLY if service account credentials exist
  if (isAdminDbAvailable()) {
    try {
      const userRef = adminDb.collection('users').doc(uid);
      const doc = await userRef.get();
      
      if (doc && doc.exists) {
        const data = doc.data();
        if (!data?.displayName) {
          await userRef.set({ displayName: defaultUsername, display_name: defaultUsername }, { merge: true }).catch(() => {});
          const updated = { ...data, displayName: defaultUsername, display_name: defaultUsername };
          setMemoryUser(uid, updated);
          persistUsers();
          await setCache(`user:${uid}`, updated, 1800).catch(() => {});
          return updated;
        }
        setMemoryUser(uid, data);
        persistUsers();
        await setCache(`user:${uid}`, data, 1800).catch(() => {});
        return data;
      }
    } catch {
      markAdminDbUnavailable();
    }
  }

  // 3. Check local memory/disk store
  const existing = memoryUserStore.get(uid);
  if (existing) {
    await setCache(`user:${uid}`, existing, 1800).catch(() => {});
    return existing;
  }
  
  const newUser = {
    email,
    displayName: defaultUsername,
    display_name: defaultUsername,
    createdAt: new Date().toISOString(),
  };
  
  if (isAdminDbAvailable()) {
    try {
      const userRef = adminDb.collection('users').doc(uid);
      await userRef.set(newUser);
    } catch {
      markAdminDbUnavailable();
    }
  }

  setMemoryUser(uid, newUser);
  persistUsers();
  await setCache(`user:${uid}`, newUser, 1800).catch(() => {});
  return newUser;
}

export async function updateUser(uid: string, data: any) {
  if (!uid) return null;
  const existing = memoryUserStore.get(uid) || {};
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  setMemoryUser(uid, merged);
  persistUsers();
  await setCache(`user:${uid}`, merged, 1800).catch(() => {});

  if (isAdminDbAvailable()) {
    try {
      const userRef = adminDb.collection('users').doc(uid);
      await userRef.set(data, { merge: true });
    } catch {
      markAdminDbUnavailable();
    }
  }

  return merged;
}

