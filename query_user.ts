import { adminDb } from './src/lib/firebase-admin';

async function run() {
  const targetEmail = process.env.TEST_USER_EMAIL || 'dev@example.com';
  const users = await adminDb.collection('users').where('email', '==', targetEmail).get();
  users.forEach(doc => {
     console.log("User:", doc.id);
     console.log("Data:", JSON.stringify(doc.data(), null, 2));
  });
}
run();
