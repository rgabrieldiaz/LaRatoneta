'use client';

import React, { useState, useEffect } from 'react';
import { X, Briefcase, Check, History, Plus, Trash2, Pencil } from 'lucide-react';
import { IncomeEntry, IncomeType, SalaryConfig } from '../lib/types';
import { formatMonthLabel } from '../lib/dateUtils';
import {
  defaultLabelForType,
  getIncomesForMonth,
  getSortedSalaryHistory,
} from '../lib/salaryUtils';

interface SalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonthKey: string;
  salaryConfig: SalaryConfig;
  onSaveIncome: (entry: Omit<IncomeEntry, 'id' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onDeleteIncome: (incomeId: string) => Promise<void>;
}

const INCOME_TYPES: { value: IncomeType; label: string; emoji: string }[] = [
  { value: 'SUELDO', label: 'Sueldo', emoji: '💼' },
  { value: 'JUBILACION', label: 'Jubilación', emoji: '👵' },
  { value: 'PENSION', label: 'Pensión', emoji: '🛡️' },
  { value: 'OTRO', label: 'Otro', emoji: '✨' },
];

export function SalaryModal({
  isOpen,
  onClose,
  selectedMonthKey,
  salaryConfig,
  onSaveIncome,
  onDeleteIncome,
}: SalaryModalProps) {
  const targetInitialMonth = selectedMonthKey === 'ALL' ? '2026-11' : selectedMonthKey;
  const [activeMonth, setActiveMonth] = useState<string>(targetInitialMonth);

  const activeIncomes = getIncomesForMonth(salaryConfig, activeMonth);
  const totalMonthIncome = activeIncomes.reduce((s, i) => s + i.amount, 0);

  // Form state
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [incomeType, setIncomeType] = useState<IncomeType>('SUELDO');
  const [customLabel, setCustomLabel] = useState<string>('Sueldo');
  const [amount, setAmount] = useState<string>('');
  const [repeatsMonthly, setRepeatsMonthly] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form to primary Sueldo when opening modal
  useEffect(() => {
    if (!isOpen) return;
    const m = selectedMonthKey === 'ALL' ? '2026-11' : selectedMonthKey;
    setActiveMonth(m);
    const list = getIncomesForMonth(salaryConfig, m);
    const sueldo = list.find((i) => i.type === 'SUELDO');
    if (sueldo) {
      setEditingId(sueldo.id.startsWith('legacy-') || sueldo.id.startsWith('default-') ? undefined : sueldo.id);
      setIncomeType('SUELDO');
      setCustomLabel(sueldo.label);
      setAmount(sueldo.amount.toString());
      setRepeatsMonthly(true);
    } else {
      setEditingId(undefined);
      setIncomeType('SUELDO');
      setCustomLabel('Sueldo');
      setAmount('');
      setRepeatsMonthly(true);
    }
  }, [selectedMonthKey, isOpen]);

  if (!isOpen) return null;

  const handleSelectType = (type: IncomeType) => {
    setIncomeType(type);
    setEditingId(undefined);
    const existing = activeIncomes.find((i) => i.type === type && type !== 'OTRO');
    if (existing) {
      setEditingId(existing.id.startsWith('legacy-') || existing.id.startsWith('default-') ? undefined : existing.id);
      setCustomLabel(existing.label);
      setAmount(existing.amount.toString());
      setRepeatsMonthly(existing.repeatsMonthly);
    } else {
      setCustomLabel(type === 'OTRO' ? '' : defaultLabelForType(type));
      setAmount('');
      setRepeatsMonthly(type !== 'OTRO');
    }
  };

  const handleLoadEntryToForm = (entry: IncomeEntry) => {
    setEditingId(entry.id.startsWith('legacy-') || entry.id.startsWith('default-') ? undefined : entry.id);
    setIncomeType(entry.type);
    setCustomLabel(entry.label);
    setAmount(entry.amount.toString());
    setRepeatsMonthly(entry.repeatsMonthly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Ingresá un monto válido en pesos.');
      return;
    }
    const finalLabel = customLabel.trim() || defaultLabelForType(incomeType);

    setIsSaving(true);
    try {
      await onSaveIncome({
        id: editingId,
        type: incomeType,
        label: finalLabel,
        amount: numericAmount,
        effectiveMonth: activeMonth,
        repeatsMonthly,
      });
      // Reset amount after adding an extra income, or close if editing primary Sueldo
      setEditingId(undefined);
      onClose();
    } catch (err: any) {
      alert('Error al guardar ingreso: ' + (err.message || err));
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
      <div className="w-full max-w-lg bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] rounded-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#FFE500] border-b-[3.5px] border-black px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000]">
              <Briefcase className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase tracking-tight text-black leading-none">
                INGRESOS DEL MES
              </h3>
              <span className="text-xs font-bold text-slate-800">
                {formatMonthLabel(activeMonth)} • Total: <strong>{formatARS(totalMonthIncome)}</strong>
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {/* Active Incomes for this month */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase text-slate-600 block">
              Ingresos cargados en {formatMonthLabel(activeMonth)}:
            </span>
            <div className="border-[2px] border-black rounded-xl divide-y-2 divide-black bg-[#F8F8F8] overflow-hidden">
              {activeIncomes.map((inc) => (
                <div key={inc.id} className="px-3.5 py-2.5 flex items-center justify-between gap-2 bg-white">
                  <div className="min-w-0">
                    <span className="font-black text-sm text-black block truncate">
                      {INCOME_TYPES.find((t) => t.value === inc.type)?.emoji} {inc.label}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {inc.repeatsMonthly ? 'Se repite mes a mes' : 'Solo este mes'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-black text-base text-black">
                      {formatARS(inc.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadEntryToForm(inc)}
                      className="p-1.5 bg-slate-100 hover:bg-[#FFE500] border border-black rounded"
                      title="Editar monto"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {activeIncomes.length > 1 && !inc.id.startsWith('legacy-') && !inc.id.startsWith('default-') && (
                      <button
                        type="button"
                        onClick={() => onDeleteIncome(inc.id)}
                        className="p-1.5 bg-slate-100 hover:bg-[#FF5376] hover:text-white border border-black rounded"
                        title="Quitar ingreso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add / Update Income Form */}
          <form onSubmit={handleSubmit} className="space-y-4 border-t-[2.5px] border-black pt-4">
            <span className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Cargar o modificar ingreso:</span>
            </span>

            {/* Type selector pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {INCOME_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleSelectType(t.value)}
                  className={`py-2 px-2.5 rounded-lg border-[2px] border-black text-xs font-black flex items-center justify-center gap-1 transition-all ${
                    incomeType === t.value
                      ? 'bg-[#FFE500] text-black shadow-[2px_2px_0px_#000]'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Name input (shown prominently for Otro, or editable for any) */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                Nombre del ingreso
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder={incomeType === 'OTRO' ? 'Ej: Aguinaldo, Alquiler, Extra...' : defaultLabelForType(incomeType)}
                className="w-full h-11 px-3 bg-[#F8F8F8] border-[2.5px] border-black rounded-lg text-sm font-bold text-black focus:outline-none focus:bg-white"
                required
              />
            </div>

            {/* Direct Amount Input */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                Monto neto en mano ($ ARS)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 font-black text-xl text-slate-400">$</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1200000"
                  className="w-full h-14 pl-9 pr-4 bg-[#F8F8F8] border-[3px] border-black rounded-xl text-2xl font-black text-black focus:outline-none focus:bg-white shadow-[2px_2px_0px_#000]"
                  required
                />
              </div>
            </div>

            {/* Repeat checkbox */}
            <label className="flex items-start gap-2.5 bg-[#FFF9D2] border-[2px] border-black p-3 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={repeatsMonthly}
                onChange={(e) => setRepeatsMonthly(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-[2px] border-black accent-[#22C55E] cursor-pointer"
              />
              <div>
                <span className="font-black text-xs sm:text-sm text-black block">
                  🔁 Repetir este ingreso los meses siguientes
                </span>
                <span className="text-[11px] font-bold text-slate-600 block leading-tight">
                  {repeatsMonthly
                    ? 'Se mantiene automáticamente hacia adelante sin cambiar los meses pasados.'
                    : 'Aplica únicamente a este mes (ideal para aguinaldo o ingreso único).'}
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="brutal-btn w-full bg-[#22C55E] text-black py-3.5 px-5 rounded-xl font-black text-sm sm:text-base uppercase flex items-center justify-center gap-2 hover:bg-[#1eb353] shadow-[4px_4px_0px_#000] disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
              <span>{isSaving ? 'GUARDANDO...' : 'GUARDAR INGRESO'}</span>
            </button>
          </form>

          {/* Compact History */}
          <div className="border-t-[2px] border-slate-200 pt-4 space-y-2">
            <span className="text-xs font-black uppercase text-slate-600 flex items-center gap-1.5">
              <History className="w-4 h-4" />
              <span>Historial mensual</span>
            </span>

            <div className="border-[2px] border-black rounded-xl overflow-hidden divide-y-2 divide-black bg-white">
              {historyList.map((item) => (
                <div
                  key={item.monthKey}
                  className={`px-3.5 py-2.5 flex items-center justify-between text-xs sm:text-sm ${
                    item.monthKey === activeMonth ? 'bg-[#FFE500]/30 font-black' : ''
                  }`}
                >
                  <span className="font-black text-black">
                    {formatMonthLabel(item.monthKey)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-black">{formatARS(item.amount)}</span>
                    {item.monthKey !== activeMonth && (
                      <button
                        type="button"
                        onClick={() => setActiveMonth(item.monthKey)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-black hover:text-white border border-black rounded text-[11px] font-bold"
                      >
                        Ver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
