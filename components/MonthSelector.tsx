'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { formatMonthLabel } from '../lib/dateUtils';

interface MonthSelectorProps {
  currentMonthKey: string;
  availableMonths: string[];
  onSelectMonth: (monthKey: string) => void;
  monthlyCount: number;
}

export function MonthSelector({
  currentMonthKey,
  availableMonths,
  onSelectMonth,
  monthlyCount,
}: MonthSelectorProps) {
  const currentIndex = availableMonths.indexOf(currentMonthKey);

  const handlePrev = () => {
    // If not 'ALL' and has next index in list (older month)
    if (currentIndex >= 0 && currentIndex < availableMonths.length - 1) {
      onSelectMonth(availableMonths[currentIndex + 1]);
    }
  };

  const handleNext = () => {
    // Newer month
    if (currentIndex > 0) {
      onSelectMonth(availableMonths[currentIndex - 1]);
    }
  };

  return (
    <div className="w-full brutal-card p-3.5 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] flex flex-wrap items-center justify-between gap-3">
      
      {/* Month Navigator with Arrows */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-[#FFE500] border-[2px] border-black rounded shadow-[2px_2px_0px_#000] overflow-hidden">
          <button
            onClick={handlePrev}
            disabled={currentIndex >= availableMonths.length - 1 || currentMonthKey === 'ALL'}
            className="p-1.5 hover:bg-yellow-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-r border-black"
            title="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5 text-black" />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 font-black text-xs sm:text-sm text-black">
            <Calendar className="w-4 h-4 text-black" />
            <span>{formatMonthLabel(currentMonthKey)}</span>
          </div>

          <button
            onClick={handleNext}
            disabled={currentIndex <= 0 || currentMonthKey === 'ALL'}
            className="p-1.5 hover:bg-yellow-400 disabled:opacity-30 disabled:hover:bg-transparent transition-colors border-l border-black"
            title="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Dropdown selector for all months */}
        <select
          value={currentMonthKey}
          onChange={(e) => onSelectMonth(e.target.value)}
          aria-label="Seleccionar mes para filtrar gastos"
          className="bg-white border-[2px] border-black text-xs font-bold px-2.5 py-1.5 rounded shadow-[2px_2px_0px_#000] cursor-pointer hover:bg-slate-50 focus:outline-none"
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
          <option value="ALL">🗓️ Histórico Completo (Todos)</option>
        </select>
      </div>

      {/* Info Badge */}
      <div className="flex items-center gap-2">
        <span className="bg-[#22C55E] text-black border border-black font-black text-xs px-2.5 py-1 rounded shadow-[1px_1px_0px_#000]">
          {monthlyCount} {monthlyCount === 1 ? 'gasto' : 'gastos'}
        </span>
        {currentMonthKey !== 'ALL' && availableMonths.length > 0 && currentMonthKey !== availableMonths[0] && (
          <button
            onClick={() => onSelectMonth(availableMonths[0])}
            className="text-[11px] font-black underline text-black hover:text-[#FF5376]"
          >
            Ir al último mes
          </button>
        )}
      </div>

    </div>
  );
}
