import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import fallbackConfig from '../../firebase-applet-config.json';

const clean = (val?: string | null) => {
  if (!val) return undefined;
  return val.trim().replace(/^["']|["']$/g, '').trim();
};

const metaEnv: Record<string, string | undefined> =
  typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : (process.env as any) || {};

const rawApiKey = clean(metaEnv.VITE_FIREBASE_API_KEY);
const rawAuthDomain = clean(metaEnv.VITE_FIREBASE_AUTH_DOMAIN);
const rawProjectId = clean(metaEnv.VITE_FIREBASE_PROJECT_ID);
const rawStorageBucket = clean(metaEnv.VITE_FIREBASE_STORAGE_BUCKET);
const rawSenderId = clean(metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID);
const rawAppId = clean(metaEnv.VITE_FIREBASE_APP_ID);

const firebaseConfig = {
  apiKey: rawApiKey || fallbackConfig.apiKey,
  authDomain: rawAuthDomain || fallbackConfig.authDomain,
  projectId: rawProjectId || fallbackConfig.projectId,
  storageBucket: rawStorageBucket || fallbackConfig.storageBucket,
  messagingSenderId: rawSenderId || fallbackConfig.messagingSenderId,
  appId: rawAppId || fallbackConfig.appId,
};

const rawDbId = clean(metaEnv.VITE_FIREBASE_DATABASE_ID);
const databaseId = rawDbId || fallbackConfig.firestoreDatabaseId;

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = databaseId && databaseId !== '(default)'
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, databaseId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });

export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });


