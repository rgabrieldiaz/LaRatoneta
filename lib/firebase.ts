import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
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
import { Expense } from './types';

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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (typeof window !== 'undefined' && isFirebaseConfigured) {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

// Google Auth Provider
export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase no está configurado aún. Agregá las variables de entorno en Vercel.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
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
  return onAuthStateChanged(auth, callback);
}

// -------------------------------------------------------------
// FIRESTORE SYNC FOR GASTOS (USERS/{USER_ID}/EXPENSES)
// -------------------------------------------------------------

export function subscribeToUserExpenses(userId: string, callback: (expenses: Expense[]) => void) {
  if (!db) return () => {};

  const colRef = collection(db, 'users', userId, 'expenses');
  const q = query(colRef, orderBy('date', 'desc'));

  return onSnapshot(colRef, (snapshot) => {
    const expenses: Expense[] = [];
    snapshot.forEach((docSnap) => {
      expenses.push({ id: docSnap.id, ...docSnap.data() } as Expense);
    });
    // Sort in JS to ensure clean ordering
    expenses.sort((a, b) => (b.date > a.date ? 1 : -1));
    callback(expenses);
  }, (err) => {
    console.error('Error fetching expenses from Firestore:', err);
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
