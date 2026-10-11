import fs from 'fs';
import path from 'path';
import { adminDb } from '../lib/firebase-admin';
import { getCache, setCache } from '../lib/redis-cache';

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', '.data') : path.join(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const memoryUserStore = new Map<string, any>();

// Load persistent users if present
try {
  if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      memoryUserStore.set(k, v);
    }
  }
} catch {
  // Silent fallback
}

function persistUsers() {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, any> = {};
    for (const [k, v] of memoryUserStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Non-blocking fallback
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
  
  // 2. Try Firestore if credentials exist
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();
    
    if (doc && doc.exists) {
      const data = doc.data();
      if (!data?.displayName) {
        await userRef.set({ displayName: defaultUsername, display_name: defaultUsername }, { merge: true }).catch(() => {});
        const updated = { ...data, displayName: defaultUsername, display_name: defaultUsername };
        memoryUserStore.set(uid, updated);
        persistUsers();
        await setCache(`user:${uid}`, updated, 1800).catch(() => {});
        return updated;
      }
      memoryUserStore.set(uid, data);
      persistUsers();
      await setCache(`user:${uid}`, data, 1800).catch(() => {});
      return data;
    }
  } catch {
    // Admin DB credentials not present or network unavailable
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
  
  try {
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.set(newUser);
  } catch {
    // Graceful fallback to memory store
  }

  memoryUserStore.set(uid, newUser);
  persistUsers();
  await setCache(`user:${uid}`, newUser, 1800).catch(() => {});
  return newUser;
}

export async function updateUser(uid: string, data: any) {
  if (!uid) return null;
  const existing = memoryUserStore.get(uid) || {};
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  memoryUserStore.set(uid, merged);
  persistUsers();
  await setCache(`user:${uid}`, merged, 1800).catch(() => {});

  try {
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.set(data, { merge: true });
  } catch {
    // Non-blocking Firestore write fallback
  }

  return merged;
}

