import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User, 
  Auth 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch, 
  getDocs,
  Firestore 
} from 'firebase/firestore';
import { CategoryBudgets, Expense, MerchantRule, MerchantRulesMap, SalaryConfig } from './types';
import { INITIAL_EXPENSES } from './initialData';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase config is actually provided
export const isFirebaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
);

export const PRIMARY_LEDGER_ID = 'primary';
export const AUTHORIZED_EMAILS = [
  'gretelfabregas@gmail.com',
  'gabrieldiaz81@gmail.com'
];

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (typeof window !== 'undefined' && isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

// Direct redirect method (bypasses browser popup blockers 100%)
export async function loginWithGoogleRedirect(): Promise<void> {
  if (!auth) {
    throw new Error('Firebase no está configurado aún. Agregá las variables de entorno en Vercel.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithRedirect(auth, provider);
}

// Google Auth Provider with intelligent fallback for mobile/popup blockers
export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase no está configurado aún. Agregá las variables de entorno en Vercel.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    // If the browser popup blocker intercepted the popup, fall back to redirect automatically
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
      console.warn('Popup bloqueado por el navegador. Usando redirección directa...');
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function onUserAuthStateChanged(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  // Process redirect result if coming back from redirect flow
  getRedirectResult(auth).catch((err) => {
    if (err?.code !== 'auth/null-user') {
      console.warn('Redirect auth check:', err?.message || err);
    }
  });
  return onAuthStateChanged(auth, callback);
}

// -------------------------------------------------------------
// FIRESTORE SYNC FOR GASTOS (USERS/{USER_ID}/EXPENSES)
// -------------------------------------------------------------

export function subscribeToUserExpenses(userId: string, callback: (expenses: Expense[]) => void) {
  if (!db) {
    callback(INITIAL_EXPENSES);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'expenses');

  return onSnapshot(colRef, (snapshot) => {
    if (snapshot.empty) {
      // If collection is empty, return initial expenses so user is never left with an empty screen
      callback(INITIAL_EXPENSES);
      // Attempt background seed
      seedInitialExpensesIfEmpty(userId, INITIAL_EXPENSES).catch(console.error);
      return;
    }

    const expenses: Expense[] = [];
    snapshot.forEach((docSnap) => {
      expenses.push({ id: docSnap.id, ...docSnap.data() } as Expense);
    });
    // Sort in JS to ensure clean ordering
    expenses.sort((a, b) => (b.date > a.date ? 1 : -1));
    callback(expenses);
  }, (err) => {
    console.warn('Firestore sync note (fallback to initial data active):', err?.message || err);
    // Never leave the authorized user with an empty screen on permission error
    callback(INITIAL_EXPENSES);
  });
}

export function subscribeToUserPending(userId: string, callback: (pending: Expense[]) => void) {
  if (!db) return () => {};

  const colRef = collection(db, 'users', userId, 'pending_expenses');
  return onSnapshot(colRef, (snapshot) => {
    const pending: Expense[] = [];
    snapshot.forEach((docSnap) => {
      pending.push({ id: docSnap.id, ...docSnap.data() } as Expense);
    });
    callback(pending);
  }, (err) => {
    console.error('Error fetching pending from Firestore:', err);
  });
}

export async function saveExpenseToFirestore(userId: string, expense: Expense): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'users', userId, 'expenses', expense.id);
  await setDoc(docRef, expense, { merge: true });
}

export async function deleteExpenseFromFirestore(userId: string, expenseId: string): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'users', userId, 'expenses', expenseId);
  await deleteDoc(docRef);
}

export async function confirmPendingInFirestore(userId: string, expense: Expense): Promise<void> {
  if (!db) return;
  const batch = writeBatch(db);

  // 1. Delete from pending
  const pendingDocRef = doc(db, 'users', userId, 'pending_expenses', expense.id);
  batch.delete(pendingDocRef);

  // 2. Add to confirmed expenses
  const confirmedDocRef = doc(db, 'users', userId, 'expenses', expense.id);
  batch.set(confirmedDocRef, { ...expense, isConfirmed: true });

  await batch.commit();
}

export async function rejectPendingInFirestore(userId: string, expenseId: string): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'users', userId, 'pending_expenses', expenseId);
  await deleteDoc(docRef);
}

export async function bulkImportToFirestore(userId: string, expenses: Expense[]): Promise<void> {
  if (!db) return;
  
  // Firestore batches support up to 500 operations
  const batch = writeBatch(db);
  for (const exp of expenses) {
    const docRef = doc(db, 'users', userId, 'expenses', exp.id);
    batch.set(docRef, exp, { merge: true });
  }
  await batch.commit();
}

/**
 * On first login of gretelfabregas@gmail.com, if Firestore has 0 expenses,
 * automatically seed the 70 expenses from her Keep notes!
 */
export async function seedInitialExpensesIfEmpty(userId: string, initialExpenses: Expense[]): Promise<boolean> {
  if (!db) return false;
  
  const colRef = collection(db, 'users', userId, 'expenses');
  const snap = await getDocs(colRef);

  if (snap.empty) {
    await bulkImportToFirestore(userId, initialExpenses);
    return true;
  }
  return false;
}

/**
 * Reset all expenses in Firestore and seed the clean November batch
 */
export async function resetAndSeedExpenses(userId: string, expenses: Expense[]): Promise<void> {
  if (!db) return;
  const colRef = collection(db, 'users', userId, 'expenses');
  const snap = await getDocs(colRef);
  
  const batch = writeBatch(db);
  snap.forEach(docSnap => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();

  await bulkImportToFirestore(userId, expenses);
}

/**
 * Salary and Paritaria Management
 */
export const DEFAULT_SALARY_CONFIG: SalaryConfig = {
  baseSalary: 1200000,
  monthlyOverrides: {
    '2026-11': 1200000,
  },
  history: [
    {
      id: 'sal-2026-11',
      effectiveMonth: '2026-11',
      amount: 1200000,
      note: 'Sueldo Noviembre 2026',
    },
  ],
};

export function subscribeToSalary(userId: string, callback: (config: SalaryConfig) => void) {
  if (!db) {
    callback(DEFAULT_SALARY_CONFIG);
    return () => {};
  }

  const docRef = doc(db, 'users', userId, 'settings', 'salary');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as SalaryConfig);
    } else {
      callback(DEFAULT_SALARY_CONFIG);
    }
  }, (err) => {
    console.warn('Salary sync note (using default):', err?.message || err);
    callback(DEFAULT_SALARY_CONFIG);
  });
}

export async function saveSalaryToFirestore(userId: string, config: SalaryConfig): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'users', userId, 'settings', 'salary');
  await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Category Monthly Budgets / Threshold Alerts
 */
export function subscribeToCategoryBudgets(
  userId: string,
  callback: (budgets: CategoryBudgets) => void
) {
  if (!db) {
    callback({});
    return () => {};
  }

  const docRef = doc(db, 'users', userId, 'settings', 'budgets');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback((data?.limits || {}) as CategoryBudgets);
      } else {
        callback({});
      }
    },
    (err) => {
      console.warn('Category budgets sync note:', err?.message || err);
      callback({});
    }
  );
}

export async function saveCategoryBudgetsToFirestore(
  userId: string,
  limits: CategoryBudgets
): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'users', userId, 'settings', 'budgets');
  await setDoc(docRef, { limits, updatedAt: new Date().toISOString() });
}

/**
 * Learned Merchant Rules (Auto-categorization memory)
 */
export function subscribeToMerchantRules(
  userId: string,
  callback: (rules: MerchantRulesMap) => void
) {
  if (!db) {
    callback({});
    return () => {};
  }

  const docRef = doc(db, 'users', userId, 'settings', 'merchant_rules');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        callback((data?.rules || {}) as MerchantRulesMap);
      } else {
        callback({});
      }
    },
    (error) => {
      console.error('Firestore merchant_rules snapshot error:', error);
      callback({});
    }
  );
}

export async function saveMerchantRuleToFirestore(
  userId: string,
  merchantKey: string,
  rule: MerchantRule
): Promise<void> {
  if (!db) return;
  const docRef = doc(db, 'users', userId, 'settings', 'merchant_rules');
  await setDoc(
    docRef,
    {
      rules: {
        [merchantKey]: rule,
      },
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}
