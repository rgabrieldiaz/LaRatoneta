'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Target, Check } from 'lucide-react';
import { Category, CategoryBudgets, Expense } from '../lib/types';

interface CategoryBudgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  categoryBudgets: CategoryBudgets;
  onSaveBudgets: (budgets: CategoryBudgets) => Promise<void>;
  monthLabel: string;
}

const DAILY_CATEGORIES: Category[] = [
  'Comida & Salidas',
  'Supermercados',
  'Frescos & Panadería',
  'Cuidado & Varios',
  'Transporte',
  'Salud & Farmacia',
  'Hogar & Servicios',
];

export function CategoryBudgetsModal({
  isOpen,
  onClose,
  expenses,
  categoryBudgets,
  onSaveBudgets,
  monthLabel,
}: CategoryBudgetsModalProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Calculate current spent per category for Argentine reference
  const currentSpentByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenses) {
      if (e.currency === 'ARS') {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
      }
    }
    return totals;
  }, [expenses]);

  useEffect(() => {
    if (!isOpen) return;
    const init: Record<string, string> = {};
    for (const cat of DAILY_CATEGORIES) {
      const val = categoryBudgets[cat];
      init[cat] = val && val > 0 ? String(val) : '';
    }
    setDrafts(init);
  }, [isOpen, categoryBudgets]);

  if (!isOpen) return null;

  const formatARS = (val: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleaned: CategoryBudgets = {};
      for (const cat of DAILY_CATEGORIES) {
        const num = parseFloat(drafts[cat] || '');
        if (!isNaN(num) && num > 0) {
          cleaned[cat] = Math.round(num);
        }
      }
      await onSaveBudgets(cleaned);
      onClose();
    } catch (err: any) {
      alert('Error al guardar topes: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] rounded-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#FFE500] border-b-[3.5px] border-black px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000]">
              <Target className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg uppercase tracking-tight text-black leading-none">
                TOPES POR CATEGORÍA
              </h3>
              <span className="text-xs font-bold text-slate-800">
                Avisos suaves al llegar al 80% o superar el límite
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000] hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <p className="text-xs font-bold text-slate-600 leading-relaxed">
            Dejá vacío en las categorías donde no quieras tope. Se repite todos los meses hasta que lo cambies.
          </p>

          <div className="space-y-2.5">
            {DAILY_CATEGORIES.map((cat) => {
              const spent = currentSpentByCategory[cat] || 0;
              return (
                <div
                  key={cat}
                  className="p-3 bg-[#F8F8F8] border-[2px] border-black rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-black text-sm text-black block truncate">{cat}</span>
                    <span className="text-[11px] font-bold text-slate-500 block">
                      {monthLabel}: <strong className="text-slate-700">{formatARS(spent)}</strong>
                    </span>
                  </div>

                  <div className="relative w-36 shrink-0">
                    <span className="absolute left-2.5 top-2.5 text-sm font-black text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={drafts[cat] ?? ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [cat]: e.target.value }))}
                      placeholder="Sin tope"
                      className="w-full h-10 pl-6 pr-2.5 bg-white border-[2px] border-black rounded-lg text-sm font-black text-black placeholder:text-slate-400 placeholder:font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="brutal-btn w-full bg-[#22C55E] text-black py-3.5 px-5 rounded-xl font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 hover:bg-[#1eb353] shadow-[4px_4px_0px_#000] disabled:opacity-50"
          >
            <Check className="w-5 h-5" />
            <span>{isSaving ? 'GUARDANDO...' : 'GUARDAR TOPES'}</span>
          </button>
        </form>

      </div>
    </div>
  );
}
