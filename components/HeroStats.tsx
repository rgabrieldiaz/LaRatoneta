'use client';

import React from 'react';
import { Expense } from '../lib/types';
import { Wallet, DollarSign, Banknote, Smartphone, TrendingUp } from 'lucide-react';

interface HeroStatsProps {
  expenses: Expense[];
  monthLabel?: string;
  budgetARS?: number;
}

export function HeroStats({ expenses, monthLabel = 'Noviembre 2026', budgetARS = 1800000 }: HeroStatsProps) {
  // Calculate Totals
  const totalARS = expenses
    .filter(e => e.currency === 'ARS')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalUSD = expenses
    .filter(e => e.currency === 'USD')
    .reduce((sum, e) => sum + e.amount, 0);

  const budgetPct = Math.min(Math.round((totalARS / budgetARS) * 100), 100);
  const remainingARS = Math.max(budgetARS - totalARS, 0);

  // Daily average (days in current month or count of unique days)
  const uniqueDays = new Set(expenses.map(e => e.date)).size || 1;
  const dailyAverageARS = Math.round(totalARS / uniqueDays);

  // Cash vs Digital Breakdown
  const cashARS = expenses
    .filter(e => e.currency === 'ARS' && e.method === 'EFECTIVO')
    .reduce((sum, e) => sum + e.amount, 0);

  const digitalARS = totalARS - cashARS;
  const cashPct = totalARS > 0 ? Math.round((cashARS / totalARS) * 100) : 0;
  const digitalPct = totalARS > 0 ? 100 - cashPct : 0;

  // Category breakdown
  const categoryTotals: Record<string, number> = {};
  for (const e of expenses) {
    if (e.currency === 'ARS') {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    }
  }

  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const formatARS = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="w-full brutal-card p-5 sm:p-6 space-y-5 bg-white border-[3.5px] border-black shadow-[4px_4px_0px_#000]">
      {/* Top Header Label */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-[#FFE500] border-2 border-black flex items-center justify-center font-bold shadow-[2px_2px_0px_#000]">
            <Wallet className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-800">
              TOTAL GASTADO EN {monthLabel.toUpperCase()}
            </h2>
            <p className="text-xs font-bold text-slate-600">{expenses.length} movimientos analizados</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="brutal-badge bg-[#22C55E] text-black px-2.5 py-1 text-xs font-black border border-black shadow-[1.5px_1.5px_0px_#000]">
            EN VIVO ⚡
          </span>
        </div>
      </div>

      {/* Hero Amounts (Significantly larger numbers) */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pt-1">
        <div>
          <span className="text-4xl sm:text-6xl font-black tracking-tight text-black">
            {formatARS(totalARS)}
          </span>
          <span className="ml-2 font-black text-base sm:text-lg uppercase text-slate-700">ARS</span>
        </div>

        {totalUSD > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00E5FF] text-black border-[2.5px] border-black shadow-[2.5px_2.5px_0px_#000] rounded-lg font-black text-sm sm:text-base">
            <DollarSign className="w-5 h-5" />
            <span>+ {formatUSD(totalUSD)} USD TARJETA</span>
          </div>
        )}
      </div>

      {/* Cash vs Digital Bar (Critical for Argentine reality) */}
      <div className="bg-[#FFF9D2] border-[2px] border-black rounded-xl p-3.5 space-y-2 shadow-[2px_2px_0px_#000]">
        <div className="flex items-center justify-between text-xs sm:text-sm font-black flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-black">
            <Banknote className="w-5 h-5 text-[#FF5376]" />
            <span>💵 EFECTIVO: {formatARS(cashARS)} ({cashPct}%)</span>
          </span>
          <span className="flex items-center gap-1.5 text-black">
            <Smartphone className="w-5 h-5 text-[#22C55E]" />
            <span>📱 DIGITAL / APPS: {formatARS(digitalARS)} ({digitalPct}%)</span>
          </span>
        </div>

        {/* Dual progress bar */}
        <div className="w-full h-3.5 bg-slate-200 border-[2px] border-black rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${cashPct}%` }} 
            className="bg-[#FFE500] h-full border-r border-black" 
            title={`Efectivo: ${cashPct}%`}
          />
          <div 
            style={{ width: `${digitalPct}%` }} 
            className="bg-[#00E5FF] h-full" 
            title={`Digital: ${digitalPct}%`}
          />
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs sm:text-sm font-black uppercase">
          <span className="text-slate-800">
            PRESUPUESTO: {budgetPct}% CONSUMIDO
          </span>
          <span className={budgetPct > 85 ? 'text-[#FF5376]' : 'text-slate-700'}>
            QUEDAN {formatARS(remainingARS)}
          </span>
        </div>

        <div className="w-full h-6 bg-[#EEEEEE] border-[3px] border-black rounded-lg relative overflow-hidden">
          <div
            className={`h-full border-r-[3px] border-black transition-all duration-500 ${
              budgetPct > 85 ? 'bg-[#FF5376]' : budgetPct > 65 ? 'bg-[#FFE500]' : 'bg-[#22C55E]'
            }`}
            style={{ width: `${budgetPct}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-end pr-3 pointer-events-none">
            <span className="text-xs font-black text-black">{budgetPct}%</span>
          </div>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
        <div className="bg-[#F8F8F8] border-[2px] border-black rounded-lg p-3 shadow-[2px_2px_0px_#000]">
          <span className="text-xs font-black uppercase text-slate-500 block">PROMEDIO / DÍA</span>
          <span className="text-lg sm:text-xl font-black text-black mt-1 block">{formatARS(dailyAverageARS)}</span>
        </div>

        <div className="bg-[#F8F8F8] border-[2px] border-black rounded-lg p-3 shadow-[2px_2px_0px_#000]">
          <span className="text-xs font-black uppercase text-slate-500 block">DÍAS CON COMPRAS</span>
          <span className="text-lg sm:text-xl font-black text-black mt-1 block">{uniqueDays} DÍAS</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#F8F8F8] border-[2px] border-black rounded-lg p-3 shadow-[2px_2px_0px_#000]">
          <span className="text-xs font-black uppercase text-slate-500 block">TOP CATEGORÍA</span>
          <span className="text-sm font-black text-[#FF5376] mt-1 block truncate">
            {sortedCategories[0]?.[0] || 'Varios'}: {formatARS(sortedCategories[0]?.[1] || 0)}
          </span>
        </div>
      </div>

      {/* Top Categories Pills */}
      {sortedCategories.length > 0 && (
        <div className="pt-2 border-t-[2px] border-black flex flex-wrap gap-2 items-center">
          <span className="text-xs font-black uppercase text-slate-600 mr-1">TOP GASTOS:</span>
          {sortedCategories.map(([cat, val], idx) => {
            const colors = ['bg-[#FFE500]', 'bg-[#00E5FF]', 'bg-[#22C55E]', 'bg-[#D4B2FF]'];
            return (
              <div
                key={cat}
                className={`px-3 py-1 border-[2px] border-black rounded-lg text-xs sm:text-sm font-black shadow-[1.5px_1.5px_0px_#000] ${colors[idx % colors.length]}`}
              >
                {cat}: {formatARS(val)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
