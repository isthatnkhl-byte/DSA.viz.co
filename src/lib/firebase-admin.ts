import fs from 'node:fs';
import { initializeApp, getApps, getApp, cert, type AppOptions } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fallbackConfig from '../config/firebase-config';

const clean = (val?: string | null) => {
  if (!val) return undefined;
  return val.trim().replace(/^["']|["']$/g, '').trim();
};

const projectId = clean(process.env.VITE_FIREBASE_PROJECT_ID) || fallbackConfig.projectId;
const databaseId = clean(process.env.VITE_FIREBASE_DATABASE_ID) || fallbackConfig.firestoreDatabaseId;

function resolveAdminCredentialOptions(): { options: AppOptions; hasCredentials: boolean } {
  const serviceAccountJson =
    clean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) ||
    clean(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (parsed && parsed.client_email && parsed.private_key) {
        return {
          options: { projectId, credential: cert(parsed) },
          hasCredentials: true,
        };
      }
    } catch {
      // Fall through
    }
  }

  const clientEmail = clean(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = clean(process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');
  if (clientEmail && privateKey) {
    try {
      return {
        options: {
          projectId,
          credential: cert({ projectId, clientEmail, privateKey }),
        },
        hasCredentials: true,
      };
    } catch {
      // Fall through
    }
  }

  const adcPath = clean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (adcPath) {
    try {
      if (fs.existsSync(adcPath)) {
        return { options: { projectId }, hasCredentials: true };
      }
    } catch {
      // Fall through
    }
  }

  const isGcpRuntime = Boolean(
    process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.GAE_SERVICE ||
      process.env.CLOUD_RUN_JOB
  );

  return {
    options: { projectId },
    hasCredentials: isGcpRuntime,
  };
}

const { options: adminAppOptions, hasCredentials: hasConfiguredAdminCredentials } =
  resolveAdminCredentialOptions();

let adminDbCircuitTripped = false;

export function isAdminDbAvailable(): boolean {
  return hasConfiguredAdminCredentials && !adminDbCircuitTripped;
}

export function markAdminDbUnavailable(): void {
  adminDbCircuitTripped = true;
}

export const adminApp = !getApps().length
  ? initializeApp(adminAppOptions)
  : getApp();

export const adminAuth = getAuth(adminApp);
export const adminDb = databaseId
  ? getFirestore(adminApp, databaseId)
  : getFirestore(adminApp);


