import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fallbackConfig from '../../firebase-applet-config.json';

const clean = (val?: string | null) => {
  if (!val) return undefined;
  return val.trim().replace(/^["']|["']$/g, '').trim();
};

const projectId = clean(process.env.VITE_FIREBASE_PROJECT_ID) || fallbackConfig.projectId;
const databaseId = clean(process.env.VITE_FIREBASE_DATABASE_ID) || fallbackConfig.firestoreDatabaseId;

export const adminApp = !getApps().length
  ? initializeApp({
      projectId,
    })
  : getApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = databaseId
  ? getFirestore(adminApp, databaseId)
  : getFirestore(adminApp);

