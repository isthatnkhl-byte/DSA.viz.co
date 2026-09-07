import { adminDb } from './src/lib/firebase-admin';

async function run() {
  const users = await adminDb.collection('users').where('email', '==', 'nikhilggoswami5380@gmail.com').get();
  users.forEach(doc => {
     console.log("User:", doc.id);
     console.log("Data:", JSON.stringify(doc.data(), null, 2));
  });
}
run();
