'use client';

import React from 'react';
import { Expense } from '../lib/types';
import { TrendingUp, Wallet, Flame, ArrowUpRight, DollarSign } from 'lucide-react';

interface HeroStatsProps {
  expenses: Expense[];
  budgetARS?: number;
}

export function HeroStats({ expenses, budgetARS = 1800000 }: HeroStatsProps) {
  // Calculate Totals
  const totalARS = expenses
    .filter(e => e.currency === 'ARS')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalUSD = expenses
    .filter(e => e.currency === 'USD')
    .reduce((sum, e) => sum + e.amount, 0);

  const budgetPct = Math.min(Math.round((totalARS / budgetARS) * 100), 100);
  const remainingARS = Math.max(budgetARS - totalARS, 0);

  // Daily average (assuming 21 days passed this month)
  const currentDay = 21;
  const dailyAverageARS = Math.round(totalARS / currentDay);

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
    <div className="w-full brutal-card p-5 space-y-4">
      {/* Top Header Label */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#FFE500] border-2 border-black flex items-center justify-center font-bold">
            <Wallet className="w-4 h-4 text-black" />
          </div>
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-700">TOTAL GASTADO EN NOVIEMBRE</h2>
            <p className="text-[11px] text-slate-500 font-bold">{expenses.length} movimientos registrados</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="brutal-badge bg-[#22C55E] text-black px-2 py-0.5">
            EN LÍNEA ⚡
          </span>
        </div>
      </div>

      {/* Hero Amounts */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pt-1">
        <div>
          <span className="text-3xl md:text-5xl font-black tracking-tight text-black">
            {formatARS(totalARS)}
          </span>
          <span className="ml-2 font-black text-sm uppercase text-slate-700">ARS</span>
        </div>

        {totalUSD > 0 && (
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#00E5FF] text-black border-[2.5px] border-black shadow-[2.5px_2.5px_0px_#000] rounded font-black text-sm">
            <DollarSign className="w-4 h-4" />
            <span>+ {formatUSD(totalUSD)} USD TARJETA</span>
          </div>
        )}
      </div>

      {/* Budget Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-black uppercase">
          <span className="text-slate-800">
            PRESUPUESTO: {budgetPct}% CONSUMIDO
          </span>
          <span className="text-[#FF5376]">
            QUEDAN {formatARS(remainingARS)}
          </span>
        </div>

        <div className="w-full h-5 bg-[#EEEEEE] border-[3px] border-black rounded relative overflow-hidden">
          <div
            className={`h-full border-r-[3px] border-black transition-all duration-500 ${
              budgetPct > 85 ? 'bg-[#FF5376]' : budgetPct > 65 ? 'bg-[#FFE500]' : 'bg-[#22C55E]'
            }`}
            style={{ width: `${budgetPct}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none">
            <span className="text-[10px] font-black text-black">{budgetPct}%</span>
          </div>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
        <div className="bg-[#F8F8F8] border-[2px] border-black rounded p-2.5 shadow-[2px_2px_0px_#000]">
          <span className="text-[10px] font-black uppercase text-slate-500 block">PROMEDIO DIARIO</span>
          <span className="text-base font-black text-black mt-0.5 block">{formatARS(dailyAverageARS)}</span>
        </div>

        <div className="bg-[#F8F8F8] border-[2px] border-black rounded p-2.5 shadow-[2px_2px_0px_#000]">
          <span className="text-[10px] font-black uppercase text-slate-500 block">DÍAS RESTANTES</span>
          <span className="text-base font-black text-black mt-0.5 block">9 DÍAS</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#F8F8F8] border-[2px] border-black rounded p-2.5 shadow-[2px_2px_0px_#000]">
          <span className="text-[10px] font-black uppercase text-slate-500 block">TOP GASTO</span>
          <span className="text-xs font-black text-[#FF5376] mt-0.5 block truncate">
            {sortedCategories[0]?.[0] || 'Varios'}: {formatARS(sortedCategories[0]?.[1] || 0)}
          </span>
        </div>
      </div>

      {/* Top 4 Categories Pills */}
      <div className="pt-2 border-t-[2px] border-black flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] font-black uppercase text-slate-600 mr-1">DESGLOSE CLAVE:</span>
        {sortedCategories.map(([cat, val], idx) => {
          const colors = ['bg-[#FFE500]', 'bg-[#00E5FF]', 'bg-[#22C55E]', 'bg-[#D4B2FF]'];
          return (
            <div
              key={cat}
              className={`px-2 py-0.5 border-[1.5px] border-black rounded text-[11px] font-black ${colors[idx % colors.length]}`}
            >
              {cat}: {formatARS(val)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
