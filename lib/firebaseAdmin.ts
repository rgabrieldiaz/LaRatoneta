import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

function parseServiceAccount(): Record<string, any> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}

export function getAdminFirestore(): Firestore | null {
  if (adminDb) return adminDb;

  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return null;

  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    adminApp = getApps()[0];
  }

  adminDb = getFirestore(adminApp);
  return adminDb;
}
