'use client';

import React from 'react';
import { Expense } from '../lib/types';
import { Wallet, DollarSign, Banknote, Smartphone, Briefcase, TrendingUp, Edit3 } from 'lucide-react';

interface HeroStatsProps {
  expenses: Expense[];
  monthLabel?: string;
  salaryARS?: number;
  onOpenSalaryModal?: () => void;
}

export function HeroStats({
  expenses,
  monthLabel = 'Noviembre 2026',
  salaryARS = 1200000,
  onOpenSalaryModal,
}: HeroStatsProps) {
  // Calculate Totals
  const totalARS = expenses
    .filter(e => e.currency === 'ARS')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalUSD = expenses
    .filter(e => e.currency === 'USD')
    .reduce((sum, e) => sum + e.amount, 0);

  const salaryPct = salaryARS > 0 ? Math.round((totalARS / salaryARS) * 100) : 0;
  const remainingARS = salaryARS - totalARS;
  const isOverBudget = remainingARS < 0;

  // Daily average & Ticket average
  const arsExpenses = expenses.filter(e => e.currency === 'ARS');
  const uniqueDays = new Set(expenses.map(e => e.date)).size || 1;
  const dailyAverageARS = Math.round(totalARS / uniqueDays);
  const averageTicketARS = arsExpenses.length > 0 ? Math.round(totalARS / arsExpenses.length) : 0;

  // Highest single expense of the period
  const highestExpense = arsExpenses.reduce<Expense | null>(
    (max, e) => (!max || e.amount > max.amount ? e : max),
    null
  );

  // Cash vs Account vs Credit Breakdown
  const cashARS = arsExpenses
    .filter(e => e.method === 'EFECTIVO')
    .reduce((sum, e) => sum + e.amount, 0);

  const creditARS = arsExpenses
    .filter(e => e.method === 'CREDITO')
    .reduce((sum, e) => sum + e.amount, 0);

  const accountARS = totalARS - cashARS - creditARS;

  const cashPct = totalARS > 0 ? Math.round((cashARS / totalARS) * 100) : 0;
  const creditPct = totalARS > 0 ? Math.round((creditARS / totalARS) * 100) : 0;
  const accountPct = totalARS > 0 ? Math.max(0, 100 - cashPct - creditPct) : 0;

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
      {/* Top Header Label with Salary Button */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b-[2px] border-black">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-[#FFE500] border-2 border-black flex items-center justify-center font-bold shadow-[2px_2px_0px_#000]">
            <Wallet className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-800">
              BALANCE MENSUAL • {monthLabel.toUpperCase()}
            </h2>
          </div>
        </div>

        {/* Income Action Button */}
        {onOpenSalaryModal && (
          <button
            onClick={onOpenSalaryModal}
            className="brutal-btn bg-[#00E5FF] hover:bg-[#00cbe2] text-black px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-[2px_2px_0px_#000]"
            title="Cargar o editar ingresos del mes (Sueldo, Jubilación, Pensión, Otros)"
          >
            <Briefcase className="w-4 h-4 text-black" />
            <span>{monthLabel.toLowerCase().includes('histórico') ? 'INGRESOS ACUM.:' : 'INGRESOS:'} {formatARS(salaryARS)}</span>
            <Edit3 className="w-3.5 h-3.5 text-black ml-1" />
          </button>
        )}
      </div>

      {/* Main Amounts Row */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 pt-1">
        <div>
          <span className="text-xs font-black uppercase text-slate-500 block mb-1">
            TOTAL GASTADO EN EL MES
          </span>
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

      {/* Salary vs Spent Progress Meter */}
      <div className="bg-[#FFF9D2] border-[2.5px] border-black rounded-xl p-4 space-y-2.5 shadow-[3px_3px_0px_#000]">
        <div className="flex items-center justify-between text-xs sm:text-sm font-black flex-wrap gap-2">
          <span className="text-slate-900">
            📊 CONSUMO: {salaryPct}% DE LOS INGRESOS
          </span>
          <span className={`px-2.5 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] font-black ${
            isOverBudget ? 'bg-[#FF5376] text-white' : 'bg-[#22C55E] text-black'
          }`}>
            {isOverBudget 
              ? `🚨 DÉFICIT: -${formatARS(Math.abs(remainingARS))}`
              : `💰 TE QUEDAN: ${formatARS(remainingARS)} DISPONIBLES`
            }
          </span>
        </div>

        {/* Big Progress bar */}
        <div className="w-full h-5 bg-[#EEEEEE] border-[3px] border-black rounded-lg relative overflow-hidden">
          <div
            className={`h-full border-r-[3px] border-black transition-all duration-500 ${
              salaryPct > 90 ? 'bg-[#FF5376]' : salaryPct > 70 ? 'bg-[#FFE500]' : 'bg-[#22C55E]'
            }`}
            style={{ width: `${Math.min(salaryPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Cash vs Account vs Credit Bar */}
      <div className="bg-[#F8F8F8] border-[2px] border-black rounded-xl p-3.5 space-y-2.5 shadow-[2px_2px_0px_#000]">
        <div className="flex items-center justify-between text-xs sm:text-sm font-black flex-wrap gap-2">
          <span className="flex items-center gap-1 text-black">
            <span>💵 EFECTIVO: {formatARS(cashARS)} ({cashPct}%)</span>
          </span>
          <span className="flex items-center gap-1 text-black">
            <span>⚡ EN CUENTA: {formatARS(accountARS)} ({accountPct}%)</span>
          </span>
          <span className="flex items-center gap-1 text-[#FF5376]">
            <span>💳 CRÉDITO: {formatARS(creditARS)} ({creditPct}%)</span>
          </span>
        </div>

        {/* Triple progress bar */}
        <div className="w-full h-3.5 bg-slate-200 border-[2px] border-black rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${cashPct}%` }} 
            className="bg-[#FFE500] h-full border-r border-black" 
            title={`Efectivo: ${cashPct}%`}
          />
          <div 
            style={{ width: `${accountPct}%` }} 
            className="bg-[#22C55E] h-full border-r border-black" 
            title={`En Cuenta (Débito/Billeteras/Prepagas): ${accountPct}%`}
          />
          <div 
            style={{ width: `${creditPct}%` }} 
            className="bg-[#FF5376] h-full" 
            title={`Crédito: ${creditPct}%`}
          />
        </div>
      </div>

      {/* Quick Metrics Grid (Non-redundant, actionable stats) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
        <div className="bg-[#F8F8F8] border-[2px] border-black rounded-lg p-3 shadow-[2px_2px_0px_#000]">
          <span className="text-xs font-black uppercase text-slate-500 block">📅 PROMEDIO / DÍA</span>
          <span className="text-lg sm:text-xl font-black text-black mt-1 block">{formatARS(dailyAverageARS)}</span>
        </div>

        <div className="bg-[#F8F8F8] border-[2px] border-black rounded-lg p-3 shadow-[2px_2px_0px_#000]">
          <span className="text-xs font-black uppercase text-slate-500 block">🧾 TICKET PROMEDIO</span>
          <span className="text-lg sm:text-xl font-black text-black mt-1 block">{formatARS(averageTicketARS)}</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-[#F8F8F8] border-[2px] border-black rounded-lg p-3 shadow-[2px_2px_0px_#000]">
          <span className="text-xs font-black uppercase text-slate-500 block">🔥 MAYOR GASTO</span>
          <span className="text-sm sm:text-base font-black text-[#FF5376] mt-1 block truncate" title={highestExpense ? `${highestExpense.title}: ${formatARS(highestExpense.amount)}` : ''}>
            {highestExpense ? `${highestExpense.title}: ${formatARS(highestExpense.amount)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
