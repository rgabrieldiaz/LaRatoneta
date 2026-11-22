'use client';

import React, { useState, useMemo } from 'react';
import { Expense, Category } from '../lib/types';
import { formatMonthLabel, filterExpensesByMonth } from '../lib/dateUtils';
import { 
  X, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Sparkles,
  ShoppingBag,
  Store,
  Utensils,
  Home,
  Car,
  HeartPulse
} from 'lucide-react';

interface MonthComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  availableMonths: string[];
  initialMonthKey?: string;
}

const ALL_CATEGORIES: Category[] = [
  'Supermercados',
  'Frescos & Panadería',
  'Comida & Salidas',
  'Hogar & Servicios',
  'Transporte',
  'Salud & Farmacia',
  'Cuidado & Varios',
  'Resúmenes Tarjeta',
];

export function MonthComparisonModal({
  isOpen,
  onClose,
  expenses,
  availableMonths,
  initialMonthKey = '2026-11',
}: MonthComparisonModalProps) {
  // Filter out 'ALL' from selectable months
  const validMonths = useMemo(() => {
    return availableMonths.filter((m) => m !== 'ALL');
  }, [availableMonths]);

  const [monthA, setMonthA] = useState<string>(() => {
    return initialMonthKey !== 'ALL' ? initialMonthKey : validMonths[0] || '2026-11';
  });

  const [monthB, setMonthB] = useState<string>(() => {
    const idx = validMonths.indexOf(monthA);
    if (idx >= 0 && idx + 1 < validMonths.length) {
      return validMonths[idx + 1];
    }
    return validMonths.find((m) => m !== monthA) || validMonths[0] || '2026-10';
  });

  if (!isOpen) return null;

  // Expenses for Month A and Month B (ARS only for comparison)
  const expensesA = filterExpensesByMonth(expenses, monthA).filter((e) => e.currency === 'ARS');
  const expensesB = filterExpensesByMonth(expenses, monthB).filter((e) => e.currency === 'ARS');

  const totalA = expensesA.reduce((sum, e) => sum + e.amount, 0);
  const totalB = expensesB.reduce((sum, e) => sum + e.amount, 0);

  const diffTotal = totalA - totalB;
  const pctTotal = totalB > 0 ? Math.round(((totalA - totalB) / totalB) * 100) : 0;

  // Category breakdown
  const categoryComparisons = ALL_CATEGORIES.map((category) => {
    const sumA = expensesA
      .filter((e) => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
    const sumB = expensesB
      .filter((e) => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
    const diff = sumA - sumB;
    const pct = sumB > 0 ? Math.round(((sumA - sumB) / sumB) * 100) : (sumA > 0 ? 100 : 0);

    return {
      category,
      sumA,
      sumB,
      diff,
      pct,
    };
  }).filter((c) => c.sumA > 0 || c.sumB > 0);

  // Find biggest changes
  const biggestIncrease = [...categoryComparisons]
    .filter((c) => c.diff > 0)
    .sort((a, b) => b.diff - a.diff)[0];

  const biggestDecrease = [...categoryComparisons]
    .filter((c) => c.diff < 0)
    .sort((a, b) => a.diff - b.diff)[0];

  const formatARS = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border-[3.5px] border-black rounded-2xl shadow-[6px_6px_0px_#000] w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b-[2.5px] border-black pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFE500] border-[2px] border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000]">
              📊
            </div>
            <div>
              <h2 className="font-black text-lg sm:text-xl uppercase tracking-tight text-black">
                Comparativa Mes a Mes
              </h2>
              <p className="text-xs font-bold text-slate-500">
                Evolución de consumos y variaciones por rubro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border-[2px] border-black flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Pickers Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8F8F8] border-[2px] border-black rounded-xl p-3 shadow-[2px_2px_0px_#000]">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
              Mes Principal (A)
            </label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-[2px] border-black rounded-lg">
              <Calendar className="w-4 h-4 text-black shrink-0" />
              <select
                value={monthA}
                onChange={(e) => setMonthA(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-black text-black cursor-pointer focus:outline-none"
              >
                {validMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
              Comparar contra (B)
            </label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-[2px] border-black rounded-lg">
              <Calendar className="w-4 h-4 text-black shrink-0" />
              <select
                value={monthB}
                onChange={(e) => setMonthB(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-black text-black cursor-pointer focus:outline-none"
              >
                {validMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {monthA === monthB ? (
          <div className="p-6 bg-[#FFE500]/20 border-[2px] border-black rounded-xl text-center">
            <p className="font-black text-sm text-black">
              Seleccionaste el mismo mes en ambos lados. Elegí dos meses distintos para ver la comparación.
            </p>
          </div>
        ) : (
          <>
            {/* Total Comparison Banner */}
            <div className="bg-[#FFF9D2] border-[2.5px] border-black rounded-xl p-4 shadow-[3px_3px_0px_#000] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase text-slate-600 block">
                    TOTAL {formatMonthLabel(monthA).toUpperCase()}
                  </span>
                  <span className="text-3xl sm:text-4xl font-black text-black">
                    {formatARS(totalA)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`px-3 py-1.5 rounded-lg border-[2px] border-black shadow-[2px_2px_0px_#000] font-black text-sm flex items-center gap-1 ${
                      diffTotal < 0
                        ? 'bg-[#22C55E] text-black'
                        : diffTotal > 0
                        ? 'bg-[#FF5376] text-white'
                        : 'bg-white text-black'
                    }`}
                  >
                    {diffTotal < 0 ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : diffTotal > 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    )}
                    <span>
                      {diffTotal > 0 ? `+${formatARS(diffTotal)}` : formatARS(diffTotal)} ({pctTotal > 0 ? `+${pctTotal}%` : `${pctTotal}%`})
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-black/20 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Total {formatMonthLabel(monthB)}: {formatARS(totalB)}</span>
                <span>
                  {diffTotal < 0
                    ? `🎉 Ahorraste ${formatARS(Math.abs(diffTotal))} vs el período comparado`
                    : diffTotal > 0
                    ? `Gastaste ${formatARS(diffTotal)} más que en ${formatMonthLabel(monthB)}`
                    : 'Gastaste exactamente lo mismo'}
                </span>
              </div>
            </div>

            {/* Quick Highlights */}
            {(biggestIncrease || biggestDecrease) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {biggestIncrease && (
                  <div className="p-3 bg-red-50 border-[2px] border-red-300 rounded-xl space-y-1">
                    <span className="text-[11px] font-black uppercase text-red-700 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Mayor suba de gasto
                    </span>
                    <span className="font-black text-sm text-black block truncate">
                      {biggestIncrease.category}
                    </span>
                    <span className="text-xs font-bold text-red-600 block">
                      +{formatARS(biggestIncrease.diff)} (+{biggestIncrease.pct}%)
                    </span>
                  </div>
                )}

                {biggestDecrease && (
                  <div className="p-3 bg-emerald-50 border-[2px] border-emerald-300 rounded-xl space-y-1">
                    <span className="text-[11px] font-black uppercase text-emerald-800 flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5" /> Mayor baja / ahorro
                    </span>
                    <span className="font-black text-sm text-black block truncate">
                      {biggestDecrease.category}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 block">
                      {formatARS(biggestDecrease.diff)} ({biggestDecrease.pct}%)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Category Breakdown Table */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-700 block">
                Variación Rubro por Rubro
              </span>

              <div className="space-y-2">
                {categoryComparisons.map((c) => (
                  <div
                    key={c.category}
                    className="p-3 bg-white border-[2px] border-black rounded-xl shadow-[2px_2px_0px_#000] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-black text-xs sm:text-sm text-black block truncate">
                        {c.category}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                        <span>{formatARS(c.sumA)}</span>
                        <span>vs</span>
                        <span>{formatARS(c.sumB)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-black text-xs sm:text-sm block ${
                          c.diff < 0
                            ? 'text-emerald-600'
                            : c.diff > 0
                            ? 'text-red-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {c.diff > 0 ? `+${formatARS(c.diff)}` : formatARS(c.diff)}
                      </span>
                      <span className="text-[10px] font-black text-slate-500">
                        {c.pct > 0 ? `+${c.pct}%` : `${c.pct}%`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
