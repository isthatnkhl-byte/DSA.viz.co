import { adminDb } from '../lib/firebase-admin';

const memoryUserStore = new Map<string, any>();

export async function getOrCreateUser(uid: string, email: string) {
  const defaultUsername = email ? email.split('@')[0] : `user_${uid.slice(0, 6)}`;
  
  try {
    const userRef = adminDb.collection('users').doc(uid);
    const doc = await userRef.get();
    
    if (doc && doc.exists) {
      const data = doc.data();
      if (!data?.displayName) {
        await userRef.set({ displayName: defaultUsername, display_name: defaultUsername }, { merge: true }).catch(() => {});
        const updated = { ...data, displayName: defaultUsername, display_name: defaultUsername };
        memoryUserStore.set(uid, updated);
        return updated;
      }
      memoryUserStore.set(uid, data);
      return data;
    }
  } catch (err) {
    // Admin DB credentials not present or network unavailable
  }

  const existing = memoryUserStore.get(uid);
  if (existing) return existing;
  
  const newUser = {
    email,
    displayName: defaultUsername,
    display_name: defaultUsername,
    createdAt: new Date().toISOString(),
  };
  
  try {
    const userRef = adminDb.collection('users').doc(uid);
    await userRef.set(newUser);
  } catch (err) {
    // Graceful fallback to memory store
  }

  memoryUserStore.set(uid, newUser);
  return newUser;
}
