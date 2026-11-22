'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from '../components/Navbar';
import { MonthSelector } from '../components/MonthSelector';
import { HeroStats } from '../components/HeroStats';
import { CategoryPieChart } from '../components/CategoryPieChart';
import { QuickInput } from '../components/QuickInput';
import { InboxPending } from '../components/InboxPending';
import { ExpenseList } from '../components/ExpenseList';
import { KeepBatchModal } from '../components/KeepBatchModal';
import { IntegrationsDrawer } from '../components/IntegrationsDrawer';
import { PrivateGate } from '../components/PrivateGate';
import { INITIAL_EXPENSES } from '../lib/initialData';
import { Expense } from '../lib/types';
import { 
  getAvailableMonths, 
  filterExpensesByMonth, 
  formatMonthLabel 
} from '../lib/dateUtils';
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
  seedInitialExpensesIfEmpty,
  PRIMARY_LEDGER_ID,
  AUTHORIZED_EMAILS
} from '../lib/firebase';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Month navigation state
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('2026-11');

  // Authorization check (Gretel as primary owner + Gabo as developer/admin)
  const isAuthorized = Boolean(
    user && 
    user.email && 
    AUTHORIZED_EMAILS.map(e => e.toLowerCase()).includes(user.email.toLowerCase())
  );

  const isDevUser = Boolean(
    user && 
    user.email && 
    user.email.toLowerCase() === 'gabrieldiaz81@gmail.com'
  );

  // 1. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onUserAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);

      if (
        currentUser && 
        currentUser.email &&
        AUTHORIZED_EMAILS.map(e => e.toLowerCase()).includes(currentUser.email.toLowerCase()) && 
        isFirebaseConfigured
      ) {
        // Automatically seed the 70 initial expenses if the shared Firestore database is empty
        try {
          await seedInitialExpensesIfEmpty(PRIMARY_LEDGER_ID, INITIAL_EXPENSES);
        } catch (e) {
          console.error('Error seeding initial expenses to Firestore:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Load and Sync Expenses from shared Firestore ledger (ONLY when authorized)
  useEffect(() => {
    if (user && isAuthorized && isFirebaseConfigured) {
      const unsubExpenses = subscribeToUserExpenses(PRIMARY_LEDGER_ID, (cloudExpenses) => {
        setExpenses(cloudExpenses);
        setIsLoaded(true);
      });

      const unsubPending = subscribeToUserPending(PRIMARY_LEDGER_ID, (cloudPending) => {
        setPendingExpenses(cloudPending);
      });

      return () => {
        unsubExpenses();
        unsubPending();
      };
    } else {
      // Privacy safeguard: Zero data rendered or kept in memory for unauthenticated visitors
      setExpenses([]);
      setPendingExpenses([]);
      setIsLoaded(true);
    }
  }, [user, isAuthorized]);

  // Months available based on actual expenses
  const availableMonths = useMemo(() => {
    return getAvailableMonths(expenses);
  }, [expenses]);

  // Filtered expenses for active month
  const monthlyExpenses = useMemo(() => {
    return filterExpensesByMonth(expenses, selectedMonthKey);
  }, [expenses, selectedMonthKey]);

  const selectedMonthLabel = useMemo(() => {
    return formatMonthLabel(selectedMonthKey);
  }, [selectedMonthKey]);

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
      setExpenses([]);
      setPendingExpenses([]);
    } catch (error: any) {
      alert('Error al cerrar sesión: ' + (error.message || error));
    }
  };

  // Handlers for Expenses
  const handleAddExpense = async (expense: Expense) => {
    if (user && isFirebaseConfigured) {
      try {
        await saveExpenseToFirestore(PRIMARY_LEDGER_ID, expense);
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
        await bulkImportToFirestore(PRIMARY_LEDGER_ID, newExpenses);
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
        await deleteExpenseFromFirestore(PRIMARY_LEDGER_ID, id);
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
        await confirmPendingInFirestore(PRIMARY_LEDGER_ID, expense);
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
        await rejectPendingInFirestore(PRIMARY_LEDGER_ID, id);
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
        await saveExpenseToFirestore(PRIMARY_LEDGER_ID, newPending);
      } catch (e) {
        console.error('Error adding pending to Firestore:', e);
      }
    } else {
      setPendingExpenses(prev => [newPending, ...prev]);
    }
  };

  const handleExportCSV = () => {
    if (monthlyExpenses.length === 0) {
      alert('No hay gastos en el período seleccionado para exportar.');
      return;
    }
    const headers = ['Fecha', 'Concepto', 'Categoría', 'Método', 'Moneda', 'Monto'];
    const rows = monthlyExpenses.map(e => [
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
    link.setAttribute('download', `la_ratoneta_${selectedMonthKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Initial Auth Loading Splash
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFE500] p-4 text-center space-y-4">
        <div className="w-20 h-20 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] rounded-2xl p-3 flex items-center justify-center animate-bounce">
          <img src="/ratita.svg" alt="La Ratoneta" className="w-full h-full object-contain" />
        </div>
        <div className="bg-white border-[2px] border-black px-4 py-2 rounded shadow-[2px_2px_0px_#000]">
          <span className="font-black text-sm uppercase tracking-tight text-black">
            DESPERTANDO A LA RATONETA 🧀...
          </span>
        </div>
      </div>
    );
  }

  // 2. Strict Privacy Gate: If user is not authenticated or not in authorized list, lock access!
  if (!isAuthorized) {
    return (
      <PrivateGate
        user={user}
        authorizedEmails={AUTHORIZED_EMAILS}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isConfigured={isFirebaseConfigured}
      />
    );
  }

  // 3. Authenticated & Authorized Dashboard (Gretel & Gabo)
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
        selectedMonthLabel={selectedMonthLabel}
      />

      {/* Developer notice banner if Gabo is inspecting */}
      {isDevUser && (
        <div className="bg-black text-[#FFE500] px-4 py-1.5 text-xs font-black text-center uppercase tracking-wider flex items-center justify-center gap-2">
          <span>🛠️ MODO DESARROLLADOR / ADMIN: Sesión activa como {user?.email}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6">
        
        {/* Month Selector Bar */}
        <MonthSelector
          currentMonthKey={selectedMonthKey}
          availableMonths={availableMonths}
          onSelectMonth={setSelectedMonthKey}
          monthlyCount={monthlyExpenses.length}
        />

        {/* Hero Card with Totals, Cash vs Digital & Budget Meter */}
        <HeroStats 
          expenses={monthlyExpenses} 
          monthLabel={selectedMonthLabel}
          budgetARS={1800000} 
        />

        {/* Category Donut / Pie Chart with Percentages & Legend */}
        <CategoryPieChart
          expenses={monthlyExpenses}
          selectedMonthLabel={selectedMonthLabel}
        />

        {/* Ultra-fast Smart Input (Keep style) */}
        <QuickInput
          onAddExpense={handleAddExpense}
          onOpenBatchModal={() => setIsBatchModalOpen(true)}
        />

        {/* Inbox: Automatic Ingestion Queue (Mercado Pago, MODO, Gmail) */}
        <InboxPending
          pendingExpenses={pendingExpenses}
          onConfirm={handleConfirmPending}
          onReject={handleRejectPending}
          onSimulatePush={handleSimulatePush}
        />

        {/* Full Expenses Ledger with Filter chips and Search */}
        <ExpenseList
          expenses={monthlyExpenses}
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
