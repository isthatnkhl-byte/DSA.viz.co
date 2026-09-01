import { adminDb } from '../lib/firebase-admin';

export async function getProfile(userId: string) {
  const doc = await adminDb.collection('users').doc(userId).get();
  return doc.exists ? doc.data() : null;
}

export async function updateProfile(userId: string, data: any) {
  await adminDb.collection('users').doc(userId).set(data, { merge: true });
  const doc = await adminDb.collection('users').doc(userId).get();
  return doc.data();
}
