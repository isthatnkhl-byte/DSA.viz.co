import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  const users = await adminDb.collection('profiles').get();
  users.forEach(doc => {
     console.log("User:", doc.id, "lcUsername:", doc.data().leetcodeUsername);
     console.log("lcStats:", JSON.stringify(doc.data().leetcodeStats, null, 2));
  });
}
run();
