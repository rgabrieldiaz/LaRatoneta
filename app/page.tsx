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
import { WebhookSettingsModal } from '../components/WebhookSettingsModal';
import { PrivateGate } from '../components/PrivateGate';
import { SalaryModal } from '../components/SalaryModal';
import { CategoryBudgetsModal } from '../components/CategoryBudgetsModal';
import { MonthComparisonModal } from '../components/MonthComparisonModal';
import { ReconciliationModal } from '../components/ReconciliationModal';
import { FixedServicesChecklist } from '../components/FixedServicesChecklist';
import { INITIAL_EXPENSES } from '../lib/initialData';
import { DEFAULT_FIXED_SERVICES } from '../lib/fixedServices';
import { CategoryBudgets, Expense, FixedService, IncomeEntry, MerchantRulesMap, SalaryConfig } from '../lib/types';
import { normalizeMerchantKey } from '../lib/keepParser';
import {
  getSalaryForMonth,
  upsertIncomeInConfig,
  removeIncomeFromConfig,
  reorderIncomeInConfig,
} from '../lib/salaryUtils';
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
  resetAndSeedExpenses,
  subscribeToSalary,
  saveSalaryToFirestore,
  subscribeToCategoryBudgets,
  saveCategoryBudgetsToFirestore,
  subscribeToMerchantRules,
  saveMerchantRuleToFirestore,
  subscribeToFixedServices,
  saveFixedServicesToFirestore,
  DEFAULT_SALARY_CONFIG,
  PRIMARY_LEDGER_ID,
  AUTHORIZED_EMAILS
} from '../lib/firebase';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isReconciliationOpen, setIsReconciliationOpen] = useState(false);
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(DEFAULT_SALARY_CONFIG);
  const [isBudgetsModalOpen, setIsBudgetsModalOpen] = useState(false);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudgets>({});
  const [merchantRules, setMerchantRules] = useState<MerchantRulesMap>({});
  const [fixedServices, setFixedServices] = useState<FixedService[]>(DEFAULT_FIXED_SERVICES);
  const [budgetAlertToast, setBudgetAlertToast] = useState<{ message: string; isOver: boolean } | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ expense: Expense; secondsLeft: number } | null>(null);
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
    if (user && isAuthorized) {
      // Immediate seed in memory so user is never stranded with an empty screen
      setExpenses(prev => (prev.length > 0 ? prev : INITIAL_EXPENSES));

      if (isFirebaseConfigured) {
        const unsubExpenses = subscribeToUserExpenses(PRIMARY_LEDGER_ID, (cloudExpenses) => {
          setExpenses(cloudExpenses && cloudExpenses.length > 0 ? cloudExpenses : INITIAL_EXPENSES);
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
        setIsLoaded(true);
      }
    } else {
      // Privacy safeguard: Zero data rendered or kept in memory for unauthenticated visitors
      setExpenses([]);
      setPendingExpenses([]);
      setIsLoaded(true);
    }
  }, [user, isAuthorized]);

  // 3. Load and Sync Salary & Category Budgets from shared Firestore ledger
  useEffect(() => {
    if (user && isAuthorized && isFirebaseConfigured) {
      const unsubSalary = subscribeToSalary(PRIMARY_LEDGER_ID, (config) => {
        setSalaryConfig(config || DEFAULT_SALARY_CONFIG);
      });
      const unsubBudgets = subscribeToCategoryBudgets(PRIMARY_LEDGER_ID, (budgets) => {
        setCategoryBudgets(budgets || {});
      });
      const unsubMerchantRules = subscribeToMerchantRules(PRIMARY_LEDGER_ID, (rules) => {
        setMerchantRules(rules || {});
      });
      const unsubFixedServices = subscribeToFixedServices(PRIMARY_LEDGER_ID, (services) => {
        if (services && services.length > 0) {
          setFixedServices(services);
        }
      });
      return () => {
        unsubSalary();
        unsubBudgets();
        unsubMerchantRules();
        unsubFixedServices();
      };
    }
  }, [user, isAuthorized]);

  // Auto-dismiss category budget alert toast after 4 seconds
  useEffect(() => {
    if (!budgetAlertToast) return;
    const t = setTimeout(() => setBudgetAlertToast(null), 4000);
    return () => clearTimeout(t);
  }, [budgetAlertToast]);

  // Months available based on actual expenses
  const availableMonths = useMemo(() => {
    return getAvailableMonths(expenses);
  }, [expenses]);

  // Active salary for selected month (with paritarias timeline & historical preservation)
  const activeSalary = useMemo(() => {
    return getSalaryForMonth(salaryConfig, selectedMonthKey, availableMonths);
  }, [salaryConfig, selectedMonthKey, availableMonths]);

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
      setLoginError(null);
      await loginWithGoogle();
    } catch (error: any) {
      console.error('Error loginWithGoogle:', error);
      setLoginError(error?.message || String(error));
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
  const handleAddExpense = async (expenseOrList: Expense | Expense[]) => {
    const items = Array.isArray(expenseOrList) ? expenseOrList : [expenseOrList];
    if (items.length === 0) return;

    // Check if any expense crosses 80% or 100% of a configured category budget
    for (const expense of items) {
      const limit = categoryBudgets[expense.category];
      if (limit && limit > 0 && expense.currency === 'ARS') {
        const expMonth = expense.date.slice(0, 7);
        const prevTotal = expenses
          .filter(
            (e) =>
              e.currency === 'ARS' &&
              e.category === expense.category &&
              e.date.startsWith(expMonth)
          )
          .reduce((sum, e) => sum + e.amount, 0);
        const nextTotal = prevTotal + expense.amount;

        if (prevTotal < limit && nextTotal >= limit) {
          setBudgetAlertToast({
            isOver: true,
            message: `🚨 ${expense.category} superó su tope ($${nextTotal.toLocaleString('es-AR')} / $${limit.toLocaleString('es-AR')})`,
          });
        } else if (prevTotal < limit * 0.8 && nextTotal >= limit * 0.8) {
          const pct = Math.round((nextTotal / limit) * 100);
          setBudgetAlertToast({
            isOver: false,
            message: `⚠️ ${expense.category} llegó al ${pct}% de su tope ($${nextTotal.toLocaleString('es-AR')} / $${limit.toLocaleString('es-AR')})`,
          });
        }
      }
    }

    if (user && isFirebaseConfigured) {
      try {
        if (items.length === 1) {
          await saveExpenseToFirestore(PRIMARY_LEDGER_ID, items[0]);
        } else {
          await bulkImportToFirestore(PRIMARY_LEDGER_ID, items);
        }
      } catch (e) {
        console.error('Error saving to Firestore:', e);
      }
    } else {
      setExpenses((prev) => [...items, ...prev]);
    }
  };

  const handleSaveBudgets = async (budgets: CategoryBudgets) => {
    setCategoryBudgets(budgets);
    if (user && isFirebaseConfigured) {
      try {
        await saveCategoryBudgetsToFirestore(PRIMARY_LEDGER_ID, budgets);
      } catch (e) {
        console.error('Error saving category budgets to Firestore:', e);
      }
    }
  };

  const handleSaveFixedServices = async (services: FixedService[]) => {
    setFixedServices(services);
    if (user && isFirebaseConfigured) {
      try {
        await saveFixedServicesToFirestore(PRIMARY_LEDGER_ID, services);
      } catch (e) {
        console.error('Error saving fixed services to Firestore:', e);
      }
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

  // 5-second Undo toast countdown
  useEffect(() => {
    if (!lastDeleted) return;
    if (lastDeleted.secondsLeft <= 0) {
      setLastDeleted(null);
      return;
    }
    const timer = setTimeout(() => {
      setLastDeleted((prev) =>
        prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [lastDeleted]);

  const handleDeleteExpense = async (id: string) => {
    const target = expenses.find((e) => e.id === id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    if (target) {
      setLastDeleted({ expense: target, secondsLeft: 5 });
    }

    if (user && isFirebaseConfigured) {
      try {
        await deleteExpenseFromFirestore(PRIMARY_LEDGER_ID, id);
      } catch (e) {
        console.error('Error deleting from Firestore:', e);
      }
    }
  };

  const handleUndoDelete = async () => {
    if (!lastDeleted) return;
    const restored = lastDeleted.expense;
    setLastDeleted(null);
    setExpenses((prev) => [restored, ...prev]);

    if (user && isFirebaseConfigured) {
      try {
        await saveExpenseToFirestore(PRIMARY_LEDGER_ID, restored);
      } catch (e) {
        console.error('Error restoring deleted expense to Firestore:', e);
      }
    }
  };

  const handleUpdateExpense = async (updatedExpense: Expense) => {
    const previousExpense = expenses.find((e) => e.id === updatedExpense.id);
    setExpenses(prev => prev.map(e => (e.id === updatedExpense.id ? updatedExpense : e)));
    if (user && isFirebaseConfigured) {
      try {
        await saveExpenseToFirestore(PRIMARY_LEDGER_ID, updatedExpense);
        if (
          previousExpense &&
          (previousExpense.category !== updatedExpense.category ||
            previousExpense.method !== updatedExpense.method)
        ) {
          const merchantKey = normalizeMerchantKey(updatedExpense.title);
          if (merchantKey) {
            await saveMerchantRuleToFirestore(PRIMARY_LEDGER_ID, merchantKey, {
              category: updatedExpense.category,
              method: updatedExpense.method,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.error('Error updating expense in Firestore:', e);
      }
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

  // Multi-income saving handler preserving historical integrity
  const handleSaveIncome = async (
    entry: Omit<IncomeEntry, 'id' | 'updatedAt'> & { id?: string }
  ) => {
    const newConfig = upsertIncomeInConfig(salaryConfig, entry);
    setSalaryConfig(newConfig);
    if (user && isFirebaseConfigured) {
      try {
        await saveSalaryToFirestore(PRIMARY_LEDGER_ID, newConfig);
      } catch (e) {
        console.error('Error saving income to Firestore:', e);
      }
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    const newConfig = removeIncomeFromConfig(salaryConfig, incomeId);
    setSalaryConfig(newConfig);
    if (user && isFirebaseConfigured) {
      try {
        await saveSalaryToFirestore(PRIMARY_LEDGER_ID, newConfig);
      } catch (e) {
        console.error('Error deleting income from Firestore:', e);
      }
    }
  };

  const handleReorderIncome = async (
    monthKey: string,
    incomeId: string,
    direction: 'UP' | 'DOWN'
  ) => {
    const newConfig = reorderIncomeInConfig(salaryConfig, monthKey, incomeId, direction);
    setSalaryConfig(newConfig);
    if (user && isFirebaseConfigured) {
      try {
        await saveSalaryToFirestore(PRIMARY_LEDGER_ID, newConfig);
      } catch (e) {
        console.error('Error reordering income in Firestore:', e);
      }
    }
  };

  const handleSimulatePush = async () => {
    const samples = [
      { title: 'Supermercado Día', amount: 15400, method: 'CUENTA' as const, note: 'Ripio Prepaga NFC' },
      { title: 'Farmacity', amount: 8900, method: 'CUENTA' as const, note: 'Notificación push Banco Galicia MODO' },
      { title: 'Viaje Uber', amount: 4800, method: 'CUENTA' as const, note: 'Notificación push Mercado Pago' },
      { title: 'Panadería La Unión', amount: 1800, method: 'EFECTIVO' as const, note: 'Pago detectado en caja' }
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    const newPending: Expense = {
      id: `sim-${Date.now()}`,
      title: picked.title,
      amount: picked.amount,
      currency: 'ARS',
      category: 'Supermercados',
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
        errorMessage={loginError}
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

      {/* Subtle developer notice banner if Gabo is inspecting */}
      {isDevUser && (
        <div className="bg-black text-[#FFE500] px-4 py-1.5 text-[11px] font-bold text-center uppercase tracking-wider">
          🛠️ Modo Admin • Sesión como {user?.email}
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
          onOpenCompareModal={() => setIsCompareModalOpen(true)}
        />

        {/* Primary Action: Add Expense (Quick or Manual) right at the top */}
        <QuickInput
          onAddExpense={handleAddExpense}
          onOpenBatchModal={() => setIsBatchModalOpen(true)}
          onOpenReconciliation={() => setIsReconciliationOpen(true)}
          merchantRules={merchantRules}
        />

        {/* Hero Card with Totals, Cash vs Account vs Credit & Income Meter */}
        <HeroStats 
          expenses={monthlyExpenses} 
          monthLabel={selectedMonthLabel}
          salaryARS={activeSalary}
          onOpenSalaryModal={() => setIsSalaryModalOpen(true)}
        />

        {/* Monthly Fixed Services (Utilities & Bills) Checklist */}
        <FixedServicesChecklist
          expenses={monthlyExpenses}
          monthLabel={selectedMonthLabel}
          fixedServices={fixedServices}
          onSaveServices={handleSaveFixedServices}
          onSelectServiceToPay={(service) => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Category Donut / Pie Chart with Percentages & Legend */}
        <CategoryPieChart
          expenses={monthlyExpenses}
          selectedMonthLabel={selectedMonthLabel}
          categoryBudgets={categoryBudgets}
          onOpenBudgetsModal={() => setIsBudgetsModalOpen(true)}
        />

        {/* Full Expenses Ledger with Filter chips, Search, Edit & Delete */}
        <ExpenseList
          expenses={monthlyExpenses}
          onDeleteExpense={handleDeleteExpense}
          onUpdateExpense={handleUpdateExpense}
        />
      </main>

      {/* Keep Batch Paste Modal */}
      <KeepBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onImportExpenses={handleImportExpenses}
        merchantRules={merchantRules}
      />

      {/* Multi-Income & History Modal */}
      <SalaryModal
        isOpen={isSalaryModalOpen}
        onClose={() => setIsSalaryModalOpen(false)}
        selectedMonthKey={selectedMonthKey}
        salaryConfig={salaryConfig}
        onSaveIncome={handleSaveIncome}
        onDeleteIncome={handleDeleteIncome}
        onReorderIncome={handleReorderIncome}
      />

      {/* Phase 1: iPhone Shortcuts (Apple Pay & Siri) Settings Modal */}
      <WebhookSettingsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
      />

      {/* Category Budgets / Limits Modal */}
      <CategoryBudgetsModal
        isOpen={isBudgetsModalOpen}
        onClose={() => setIsBudgetsModalOpen(false)}
        expenses={monthlyExpenses}
        categoryBudgets={categoryBudgets}
        onSaveBudgets={handleSaveBudgets}
        monthLabel={selectedMonthLabel}
      />

      {/* Month-over-Month Comparison Modal */}
      <MonthComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        expenses={expenses}
        availableMonths={availableMonths}
        initialMonthKey={selectedMonthKey}
      />

      {/* Statement Reconciliation Modal */}
      <ReconciliationModal
        isOpen={isReconciliationOpen}
        onClose={() => setIsReconciliationOpen(false)}
        expenses={expenses}
        selectedMonthKey={selectedMonthKey}
        onImportExpenses={handleImportExpenses}
        merchantRules={merchantRules}
      />

      {/* Non-invasive 4-second Category Budget Threshold Toast */}
      {budgetAlertToast && !lastDeleted && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md border-[3px] border-black shadow-[5px_5px_0px_#000] rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
            budgetAlertToast.isOver ? 'bg-[#FF5376] text-white' : 'bg-[#FFE500] text-black'
          }`}
        >
          <span className="text-xs sm:text-sm font-black leading-snug">
            {budgetAlertToast.message}
          </span>
          <button
            onClick={() => setBudgetAlertToast(null)}
            className="text-xs font-black underline shrink-0"
          >
            OK
          </button>
        </div>
      )}

      {/* 5-second Undo Delete Toast */}
      {lastDeleted && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-black text-white border-[3px] border-[#FFE500] shadow-[5px_5px_0px_#000] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-black block truncate">
              🗑️ Borrado: {lastDeleted.expense.title} (${lastDeleted.expense.amount.toLocaleString('es-AR')})
            </span>
          </div>
          <button
            onClick={handleUndoDelete}
            className="px-3 py-1.5 bg-[#FFE500] text-black border-[2px] border-white rounded-lg text-xs font-black uppercase shrink-0 hover:bg-white transition-colors"
          >
            ↩️ Deshacer ({lastDeleted.secondsLeft}s)
          </button>
        </div>
      )}
    </div>
  );
}
