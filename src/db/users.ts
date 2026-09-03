import { adminDb } from '../lib/firebase-admin';

export async function getOrCreateUser(uid: string, email: string) {
  const defaultUsername = email ? email.split('@')[0] : `user_${uid.slice(0, 6)}`;
  const userRef = adminDb.collection('users').doc(uid);
  const doc = await userRef.get();
  
  if (doc.exists) {
    const data = doc.data();
    if (!data?.displayName) {
      await userRef.set({ displayName: defaultUsername }, { merge: true });
      return { ...data, displayName: defaultUsername };
    }
    return data;
  }
  
  const newUser = {
    email,
    displayName: defaultUsername,
    createdAt: new Date().toISOString(),
  };
  await userRef.set(newUser);
  return newUser;
}
