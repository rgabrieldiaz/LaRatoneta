'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { HeroStats } from '../components/HeroStats';
import { QuickInput } from '../components/QuickInput';
import { InboxPending } from '../components/InboxPending';
import { ExpenseList } from '../components/ExpenseList';
import { KeepBatchModal } from '../components/KeepBatchModal';
import { IntegrationsDrawer } from '../components/IntegrationsDrawer';
import { INITIAL_EXPENSES, INITIAL_PENDING } from '../lib/initialData';
import { Expense } from '../lib/types';

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<Expense[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage or initialize with her 70 real expenses from Keep
  useEffect(() => {
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
  }, []);

  // Save to localStorage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('mis_gastos_items_v1', JSON.stringify(expenses));
    }
  }, [expenses, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('mis_gastos_pending_v1', JSON.stringify(pendingExpenses));
    }
  }, [pendingExpenses, isLoaded]);

  // Handlers
  const handleAddExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
  };

  const handleImportExpenses = (newExpenses: Expense[]) => {
    setExpenses(prev => [...newExpenses, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleConfirmPending = (expense: Expense) => {
    setPendingExpenses(prev => prev.filter(p => p.id !== expense.id));
    setExpenses(prev => [{ ...expense, isConfirmed: true }, ...prev]);
  };

  const handleRejectPending = (id: string) => {
    setPendingExpenses(prev => prev.filter(p => p.id !== id));
  };

  const handleSimulatePush = () => {
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
    setPendingExpenses(prev => [newPending, ...prev]);
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
    link.setAttribute('download', `mis_gastos_${new Date().toISOString().split('T')[0]}.csv`);
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
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6">
        
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
