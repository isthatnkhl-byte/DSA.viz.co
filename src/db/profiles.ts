import { adminDb } from '../lib/firebase-admin';

// Resilient memory cache when running in environments without GCP ADC credentials
const memoryProfileStore = new Map<string, any>();

export async function getProfile(userId: string) {
  try {
    const doc = await adminDb.collection('users').doc(userId).get();
    if (doc && doc.exists) {
      const data = doc.data();
      memoryProfileStore.set(userId, { ...(memoryProfileStore.get(userId) || {}), ...data });
      return data;
    }
  } catch (err) {
    // Admin DB credentials not present or network unavailable
  }
  return memoryProfileStore.get(userId) || null;
}

export async function updateProfile(userId: string, data: any) {
  const existing = memoryProfileStore.get(userId) || {};
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  memoryProfileStore.set(userId, merged);

  try {
    await adminDb.collection('users').doc(userId).set(data, { merge: true });
    const doc = await adminDb.collection('users').doc(userId).get();
    if (doc && doc.exists) {
      return doc.data();
    }
  } catch (err) {
    // Fall back gracefully to memory store
  }
  return merged;
}
