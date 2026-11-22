'use client';

import React, { useState, useEffect } from 'react';
import { X, Briefcase, TrendingUp, Check, History, Calendar, PlusCircle, AlertCircle } from 'lucide-react';
import { SalaryConfig } from '../lib/types';
import { formatMonthLabel } from '../lib/dateUtils';
import { getSalaryForMonth, getSortedSalaryHistory } from '../lib/salaryUtils';

interface SalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonthKey: string;
  salaryConfig: SalaryConfig;
  onSaveSalary: (amount: number, isParitaria: boolean, note?: string) => Promise<void>;
}

export function SalaryModal({
  isOpen,
  onClose,
  selectedMonthKey,
  salaryConfig,
  onSaveSalary,
}: SalaryModalProps) {
  // If viewing 'ALL', default to the active month '2026-11'
  const targetInitialMonth = selectedMonthKey === 'ALL' ? '2026-11' : selectedMonthKey;

  const [activeMonth, setActiveMonth] = useState<string>(targetInitialMonth);
  const activeSalaryForMonth = getSalaryForMonth(salaryConfig, activeMonth);

  const [amount, setAmount] = useState<number>(activeSalaryForMonth);
  const [isParitaria, setIsParitaria] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const m = selectedMonthKey === 'ALL' ? '2026-11' : selectedMonthKey;
    setActiveMonth(m);
    setAmount(getSalaryForMonth(salaryConfig, m));
  }, [selectedMonthKey, isOpen]);

  useEffect(() => {
    setAmount(getSalaryForMonth(salaryConfig, activeMonth));
  }, [activeMonth, salaryConfig]);

  if (!isOpen) return null;

  const handleQuickAddPercent = (pct: number) => {
    const updated = Math.round(amount * (1 + pct / 100));
    setAmount(updated);
  };

  const handleQuickAddFixed = (fixedAmount: number) => {
    setAmount(prev => prev + fixedAmount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingresá un monto de sueldo válido.');
      return;
    }
    setIsSaving(true);
    try {
      await onSaveSalary(amount, isParitaria, note);
      onClose();
    } catch (err: any) {
      alert('Error al guardar sueldo: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const formatARS = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const historyList = getSortedSalaryHistory(salaryConfig);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] rounded-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#FFE500] border-b-[3.5px] border-black px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000]">
              <Briefcase className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight text-black leading-none">
                SUELDO & HISTORIAL MENSUAL
              </h3>
              <span className="text-xs font-bold text-slate-800">
                Mes en edición: <strong className="underline">{formatMonthLabel(activeMonth)}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000] hover:bg-slate-100 transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Amount input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-black uppercase text-slate-800">
                  Sueldo neto en mano para {formatMonthLabel(activeMonth)}:
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-3.5 font-black text-2xl text-slate-400">
                  $
                </span>
                <input
                  type="number"
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="1200000"
                  className="w-full h-16 pl-10 pr-4 bg-[#F8F8F8] border-[3px] border-black rounded-xl text-2xl sm:text-3xl font-black text-black focus:outline-none focus:bg-white shadow-[3px_3px_0px_#000]"
                  required
                />
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                <span>Monto formateado:</span>
                <span className="font-black text-sm text-black">{formatARS(amount)} ARS</span>
              </div>
            </div>

            {/* Quick increase buttons */}
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>AJUSTE POR PARITARIA O AUMENTO:</span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleQuickAddPercent(5)}
                  className="px-2.5 py-1 bg-slate-100 border-[1.5px] border-black rounded-md text-xs font-black hover:bg-[#FFE500] shadow-[1px_1px_0px_#000]"
                >
                  +5%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddPercent(10)}
                  className="px-2.5 py-1 bg-slate-100 border-[1.5px] border-black rounded-md text-xs font-black hover:bg-[#FFE500] shadow-[1px_1px_0px_#000]"
                >
                  +10%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddPercent(15)}
                  className="px-2.5 py-1 bg-slate-100 border-[1.5px] border-black rounded-md text-xs font-black hover:bg-[#FFE500] shadow-[1px_1px_0px_#000]"
                >
                  +15%
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddFixed(100000)}
                  className="px-2.5 py-1 bg-[#22C55E]/20 border-[1.5px] border-black rounded-md text-xs font-black hover:bg-[#22C55E] shadow-[1px_1px_0px_#000]"
                >
                  +$100.000
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddFixed(200000)}
                  className="px-2.5 py-1 bg-[#22C55E]/20 border-[1.5px] border-black rounded-md text-xs font-black hover:bg-[#22C55E] shadow-[1px_1px_0px_#000]"
                >
                  +$200.000
                </button>
              </div>
            </div>

            {/* Paritaria vs Month-Only Radio / Checkbox */}
            <div className="bg-[#FFF9D2] border-[2px] border-black p-3.5 rounded-xl space-y-2 shadow-[2px_2px_0px_#000]">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isParitaria}
                  onChange={(e) => setIsParitaria(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-[2px] border-black text-[#22C55E] focus:ring-0 cursor-pointer accent-[#22C55E]"
                />
                <div className="space-y-0.5">
                  <span className="font-black text-xs sm:text-sm text-black block">
                    🔁 Nueva Paritaria: Repetir en los meses siguientes
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 block leading-tight">
                    {isParitaria 
                      ? 'Este aumento se mantendrá hacia adelante mes a mes hasta la próxima paritaria, sin borrar ni alterar los meses pasados.'
                      : 'Modificará solo este mes puntual (ideal para aguinaldo o bono especial) sin afectar los demás meses.'
                    }
                  </span>
                </div>
              </label>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSaving}
              className="brutal-btn w-full bg-[#22C55E] text-black py-4 px-5 rounded-xl font-black text-base uppercase flex items-center justify-center gap-2 hover:bg-[#1eb353] shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              <span>{isSaving ? 'GUARDANDO...' : 'GUARDAR ESTE SUELDO 💾'}</span>
            </button>
          </form>

          {/* Historical Salary Timeline Table */}
          <div className="border-t-[2.5px] border-black pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                <History className="w-4 h-4 text-black" />
                <span>HISTORIAL DE SUELDOS RECORDADOS</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Cada mes guarda su propio sueldo histórico
              </span>
            </div>

            <div className="border-[2px] border-black rounded-xl overflow-hidden divide-y-2 divide-black bg-white shadow-[2px_2px_0px_#000]">
              {historyList.map((item) => {
                const isCurrentActive = item.monthKey === activeMonth;
                return (
                  <div
                    key={item.monthKey}
                    className={`p-3 flex items-center justify-between gap-3 text-xs sm:text-sm ${
                      isCurrentActive ? 'bg-[#FFE500]/30 font-black' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-black">
                          {formatMonthLabel(item.monthKey)}
                        </span>
                        {isCurrentActive && (
                          <span className="text-[10px] bg-black text-[#FFE500] px-1.5 py-0.5 rounded font-bold uppercase">
                            Activo
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-slate-500">
                          {item.isParitaria ? 'Paritaria' : 'Ajuste puntual'}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-[11px] text-slate-600 mt-0.5">{item.note}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm sm:text-base text-black">
                        {formatARS(item.amount)}
                      </span>
                      {item.monthKey !== activeMonth && (
                        <button
                          type="button"
                          onClick={() => setActiveMonth(item.monthKey)}
                          className="px-2 py-1 bg-slate-100 hover:bg-black hover:text-white border border-black rounded text-[11px] font-bold transition-colors"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold">
                💡 <strong>¿Cómo funciona el historial?</strong>
              </p>
              <p>
                Al navegar meses pasados en el panel principal, la app recordará exactamente el sueldo de ese mes para calcular si hubo superávit o déficit real en esa fecha.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
