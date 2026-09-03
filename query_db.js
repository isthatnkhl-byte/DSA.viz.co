import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
async function run() {
  const users = await db.collection('users').get();
  users.forEach(doc => {
     console.log("User:", doc.id, "lcUsername:", doc.data().leetcodeUsername);
     console.log("lcStats:", JSON.stringify(doc.data().leetcodeStats, null, 2));
  });
}
run();
