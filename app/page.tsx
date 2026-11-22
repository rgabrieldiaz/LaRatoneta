'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from '../components/Navbar';
import { HeroStats } from '../components/HeroStats';
import { QuickInput } from '../components/QuickInput';
import { InboxPending } from '../components/InboxPending';
import { ExpenseList } from '../components/ExpenseList';
import { KeepBatchModal } from '../components/KeepBatchModal';
import { IntegrationsDrawer } from '../components/IntegrationsDrawer';
import { AuthBanner } from '../components/AuthBanner';
import { INITIAL_EXPENSES, INITIAL_PENDING } from '../lib/initialData';
import { Expense } from '../lib/types';
import { 
  loginWithGoogle, 
  logoutUser, 
  onUserAuthStateChanged, 
  isFirebaseConfigured,
  subscribeToUserExpenses,
  subscribeToUserPending,
  saveExpenseToFirestore,
  deleteExpenseFromFirestore,
  confirmPendingInFirestore,
  rejectPendingInFirestore,
  bulkImportToFirestore,
  seedInitialExpensesIfEmpty
} from '../lib/firebase';

const TARGET_EMAIL = process.env.NEXT_PUBLIC_AUTHORIZED_EMAIL || 'gretelfabregas@gmail.com';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onUserAuthStateChanged(async (currentUser) => {
      setUser(currentUser);

      if (currentUser && isFirebaseConfigured) {
        // Automatically seed her 70 initial expenses if her Firestore database is empty
        try {
          await seedInitialExpensesIfEmpty(currentUser.uid, INITIAL_EXPENSES);
        } catch (e) {
          console.error('Error seeding initial expenses to Firestore:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load and Sync Expenses
  useEffect(() => {
    // If logged into Firebase
    if (user && isFirebaseConfigured) {
      const unsubExpenses = subscribeToUserExpenses(user.uid, (cloudExpenses) => {
        setExpenses(cloudExpenses);
        setIsLoaded(true);
      });

      const unsubPending = subscribeToUserPending(user.uid, (cloudPending) => {
        setPendingExpenses(cloudPending);
      });

      return () => {
        unsubExpenses();
        unsubPending();
      };
    } else {
      // Fallback: LocalStorage
      try {
        const savedExpenses = localStorage.getItem('mis_gastos_items_v1');
        if (savedExpenses) {
          setExpenses(JSON.parse(savedExpenses));
        } else {
          setExpenses(INITIAL_EXPENSES);
        }

        const savedPending = localStorage.getItem('mis_gastos_pending_v1');
        if (savedPending) {
          setPendingExpenses(JSON.parse(savedPending));
        } else {
          setPendingExpenses(INITIAL_PENDING);
        }
      } catch (e) {
        setExpenses(INITIAL_EXPENSES);
        setPendingExpenses(INITIAL_PENDING);
      }
      setIsLoaded(true);
    }
  }, [user]);

  // Save to localStorage when changed (if not connected to Firebase)
  useEffect(() => {
    if (isLoaded && (!user || !isFirebaseConfigured)) {
      localStorage.setItem('mis_gastos_items_v1', JSON.stringify(expenses));
    }
  }, [expenses, isLoaded, user]);

  useEffect(() => {
    if (isLoaded && (!user || !isFirebaseConfigured)) {
      localStorage.setItem('mis_gastos_pending_v1', JSON.stringify(pendingExpenses));
    }
  }, [pendingExpenses, isLoaded, user]);

  // Handlers for Authentication
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      alert('Error al iniciar sesión con Google: ' + (error.message || error));
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error: any) {
      alert('Error al cerrar sesión: ' + (error.message || error));
    }
  };

  // Handlers for Expenses
  const handleAddExpense = async (expense: Expense) => {
    if (user && isFirebaseConfigured) {
      try {
        await saveExpenseToFirestore(user.uid, expense);
      } catch (e) {
        console.error('Error saving to Firestore:', e);
      }
    } else {
      setExpenses(prev => [expense, ...prev]);
    }
  };

  const handleImportExpenses = async (newExpenses: Expense[]) => {
    if (user && isFirebaseConfigured) {
      try {
        await bulkImportToFirestore(user.uid, newExpenses);
      } catch (e) {
        console.error('Error bulk importing to Firestore:', e);
      }
    } else {
      setExpenses(prev => [...newExpenses, ...prev]);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (user && isFirebaseConfigured) {
      try {
        await deleteExpenseFromFirestore(user.uid, id);
      } catch (e) {
        console.error('Error deleting from Firestore:', e);
      }
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const handleConfirmPending = async (expense: Expense) => {
    if (user && isFirebaseConfigured) {
      try {
        await confirmPendingInFirestore(user.uid, expense);
      } catch (e) {
        console.error('Error confirming pending in Firestore:', e);
      }
    } else {
      setPendingExpenses(prev => prev.filter(p => p.id !== expense.id));
      setExpenses(prev => [{ ...expense, isConfirmed: true }, ...prev]);
    }
  };

  const handleRejectPending = async (id: string) => {
    if (user && isFirebaseConfigured) {
      try {
        await rejectPendingInFirestore(user.uid, id);
      } catch (e) {
        console.error('Error rejecting pending in Firestore:', e);
      }
    } else {
      setPendingExpenses(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSimulatePush = async () => {
    const samples = [
      { title: 'Supermercado Día', amount: 15400, method: 'MERCADO_PAGO' as const, note: 'Notificación de pago QR Mercado Pago' },
      { title: 'Farmacity', amount: 8900, method: 'MODO' as const, note: 'Notificación push Banco Galicia MODO' },
      { title: 'Viaje Uber', amount: 4800, method: 'MERCADO_PAGO' as const, note: 'Notificación push Uber' },
      { title: 'Panadería La Unión', amount: 1800, method: 'EFECTIVO' as const, note: 'Pago detectado en caja' }
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    const newPending: Expense = {
      id: `sim-${Date.now()}`,
      title: picked.title,
      amount: picked.amount,
      currency: 'ARS',
      category: 'Super & Chinos',
      method: picked.method,
      date: new Date().toISOString().split('T')[0],
      isConfirmed: false,
      source: 'NOTIFICATION',
      note: picked.note,
    };

    if (user && isFirebaseConfigured) {
      try {
        await saveExpenseToFirestore(user.uid, newPending);
      } catch (e) {
        console.error('Error adding pending to Firestore:', e);
      }
    } else {
      setPendingExpenses(prev => [newPending, ...prev]);
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert('No hay gastos para exportar');
      return;
    }
    const headers = ['Fecha', 'Concepto', 'Categoría', 'Método', 'Moneda', 'Monto'];
    const rows = expenses.map(e => [
      e.date,
      `"${e.title.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      e.method,
      e.currency,
      e.amount
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `la_ratoneta_${TARGET_EMAIL}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFE500] pb-16">
      {/* Navigation Bar */}
      <Navbar
        onOpenBatchModal={() => setIsBatchModalOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        onExportCSV={handleExportCSV}
        totalExpensesCount={expenses.length}
        pendingCount={pendingExpenses.length}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isConfigured={isFirebaseConfigured}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Authentication & Cloud Sync Banner */}
        <AuthBanner
          user={user}
          isConfigured={isFirebaseConfigured}
          onLogin={handleLogin}
          authorizedEmail={TARGET_EMAIL}
        />

        {/* Hero Card with Totals and Budget Meter */}
        <HeroStats expenses={expenses} budgetARS={1800000} />

        {/* Ultra-fast Smart Input (Keep style) */}
        <QuickInput
          onAddExpense={handleAddExpense}
          onOpenBatchModal={() => setIsBatchModalOpen(true)}
        />

        {/* Inbox: Automatic Ingestion Queue */}
        <InboxPending
          pendingExpenses={pendingExpenses}
          onConfirm={handleConfirmPending}
          onReject={handleRejectPending}
          onSimulatePush={handleSimulatePush}
        />

        {/* Full Expenses Ledger with Filter chips and Search */}
        <ExpenseList
          expenses={expenses}
          onDeleteExpense={handleDeleteExpense}
        />
      </main>

      {/* Keep Batch Paste Modal */}
      <KeepBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onImportExpenses={handleImportExpenses}
      />

      {/* Integrations & Automation Drawer */}
      <IntegrationsDrawer
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
      />
    </div>
  );
}
