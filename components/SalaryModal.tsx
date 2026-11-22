'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  Check,
  History,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
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
  onReorderIncome: (monthKey: string, incomeId: string, direction: 'UP' | 'DOWN') => Promise<void>;
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
  onReorderIncome,
}: SalaryModalProps) {
  const targetInitialMonth = selectedMonthKey === 'ALL' ? '2026-11' : selectedMonthKey;
  const [activeMonth, setActiveMonth] = useState<string>(targetInitialMonth);

  const activeIncomes = getIncomesForMonth(salaryConfig, activeMonth);
  const totalMonthIncome = activeIncomes.reduce((s, i) => s + i.amount, 0);

  // Inline edit state for existing rows (strictly separate from adding a new income)
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add-new-income state
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newType, setNewType] = useState<IncomeType>('SUELDO');
  const [newLabel, setNewLabel] = useState<string>('');
  const [newAmount, setNewAmount] = useState<string>('');
  const [newRepeats, setNewRepeats] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const m = selectedMonthKey === 'ALL' ? '2026-11' : selectedMonthKey;
    setActiveMonth(m);
    setEditingEntry(null);
    setConfirmDeleteId(null);
    setIsAddingNew(false);
  }, [selectedMonthKey, isOpen]);

  if (!isOpen) return null;

  const suggestLabelForNewType = (type: IncomeType) => {
    if (type === 'OTRO') return '';
    const sameTypeCount = activeIncomes.filter((i) => i.type === type).length;
    const base = defaultLabelForType(type);
    return sameTypeCount === 0 ? base : `${base} ${sameTypeCount + 1}`;
  };

  const handleOpenAddForm = () => {
    setEditingEntry(null);
    setConfirmDeleteId(null);
    setNewType('SUELDO');
    setNewLabel(suggestLabelForNewType('SUELDO'));
    setNewAmount('');
    setNewRepeats(true);
    setIsAddingNew(true);
  };

  const handleSelectNewType = (type: IncomeType) => {
    setNewType(type);
    setNewLabel(suggestLabelForNewType(type));
    setNewRepeats(type !== 'OTRO');
  };

  const handleSaveInlineEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry || editingEntry.amount <= 0) {
      alert('Ingresá un monto válido.');
      return;
    }
    setIsSaving(true);
    try {
      await onSaveIncome({
        id: editingEntry.id,
        type: editingEntry.type,
        label: editingEntry.label.trim() || defaultLabelForType(editingEntry.type),
        amount: editingEntry.amount,
        effectiveMonth: activeMonth,
        repeatsMonthly: editingEntry.repeatsMonthly,
      });
      setEditingEntry(null);
    } catch (err: any) {
      alert('Error al actualizar ingreso: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(newAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Ingresá un monto válido en pesos.');
      return;
    }
    setIsSaving(true);
    try {
      await onSaveIncome({
        type: newType,
        label: newLabel.trim() || defaultLabelForType(newType),
        amount: numericAmount,
        effectiveMonth: activeMonth,
        repeatsMonthly: newRepeats,
      });
      setIsAddingNew(false);
      setNewAmount('');
    } catch (err: any) {
      alert('Error al agregar ingreso: ' + (err.message || err));
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* 1. Existing Active Incomes List (Edit, Delete, Reorder inline) */}
          <div className="space-y-2.5">
            <span className="text-xs font-black uppercase text-slate-700 block">
              Ingresos activos en {formatMonthLabel(activeMonth)} ({activeIncomes.length}):
            </span>

            {activeIncomes.length === 0 ? (
              <div className="p-4 border-[2px] border-dashed border-slate-300 rounded-xl text-center text-xs font-bold text-slate-500">
                No hay ingresos cargados en este mes. Agregá uno abajo.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeIncomes.map((inc, idx) => {
                  const isEditingThis = editingEntry?.id === inc.id;
                  const emoji = INCOME_TYPES.find((t) => t.value === inc.type)?.emoji || '💵';

                  if (isEditingThis && editingEntry) {
                    return (
                      <form
                        key={inc.id}
                        onSubmit={handleSaveInlineEdit}
                        className="p-3.5 bg-[#FFF9D2] border-[2.5px] border-black rounded-xl space-y-3 shadow-[3px_3px_0px_#000]"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                              Nombre
                            </label>
                            <input
                              type="text"
                              value={editingEntry.label}
                              onChange={(e) =>
                                setEditingEntry({ ...editingEntry, label: e.target.value })
                              }
                              className="w-full h-10 px-2.5 bg-white border-[2px] border-black rounded-lg text-sm font-bold focus:outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-black uppercase text-slate-700 mb-1">
                              Monto ($ ARS)
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={editingEntry.amount}
                              onChange={(e) =>
                                setEditingEntry({
                                  ...editingEntry,
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full h-10 px-2.5 bg-white border-[2px] border-black rounded-lg text-base font-black focus:outline-none"
                              required
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingEntry.repeatsMonthly}
                            onChange={(e) =>
                              setEditingEntry({
                                ...editingEntry,
                                repeatsMonthly: e.target.checked,
                              })
                            }
                            className="w-4 h-4 accent-[#22C55E]"
                          />
                          <span>🔁 Repetir este ingreso los meses siguientes</span>
                        </label>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingEntry(null)}
                            className="flex-1 py-2 bg-white border-[2px] border-black rounded-lg text-xs font-black uppercase hover:bg-slate-100"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 py-2 bg-[#22C55E] border-[2px] border-black rounded-lg text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:bg-[#1eb353] flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Guardar</span>
                          </button>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={inc.id}
                      className="p-3 bg-white border-[2.5px] border-black rounded-xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_#000]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Reorder arrows (when 2+ incomes) */}
                        {activeIncomes.length > 1 && (
                          <div className="flex flex-col shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => onReorderIncome(activeMonth, inc.id, 'UP')}
                              className="p-0.5 text-slate-500 hover:text-black disabled:opacity-20"
                              title="Subir"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === activeIncomes.length - 1}
                              onClick={() => onReorderIncome(activeMonth, inc.id, 'DOWN')}
                              className="p-0.5 text-slate-500 hover:text-black disabled:opacity-20"
                              title="Bajar"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        <div className="min-w-0">
                          <span className="font-black text-sm sm:text-base text-black block truncate">
                            {emoji} {inc.label}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {inc.repeatsMonthly ? '🔁 Se repite mes a mes' : '📌 Solo este mes'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-black text-base sm:text-lg text-black mr-1">
                          {formatARS(inc.amount)}
                        </span>

                        {confirmDeleteId === inc.id ? (
                          <div className="flex items-center gap-1 bg-[#FF5376]/10 border border-[#FF5376] rounded px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteIncome(inc.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 bg-[#FF5376] text-white text-[11px] font-black rounded"
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 bg-white text-black text-[11px] font-black rounded border border-black"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingNew(false);
                                setConfirmDeleteId(null);
                                setEditingEntry({ ...inc });
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-[#FFE500] border border-black rounded-lg"
                              title="Modificar este ingreso"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {!inc.id.startsWith('legacy-') && !inc.id.startsWith('default-') && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(inc.id)}
                                className="p-1.5 bg-slate-100 hover:bg-[#FF5376] hover:text-white border border-black rounded-lg"
                                title="Borrar este ingreso"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Add a NEW Income (strictly separated from editing above) */}
          {!isAddingNew ? (
            <button
              type="button"
              onClick={handleOpenAddForm}
              className="w-full py-3 px-4 bg-[#00E5FF] hover:bg-[#00cbe2] border-[2.5px] border-black rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar nuevo ingreso (2do sueldo, jubilación, otro...)</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddNewSubmit}
              className="p-4 bg-[#F8F8F8] border-[3px] border-black rounded-xl space-y-4 shadow-[4px_4px_0px_#000]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-black">
                  ➕ Nuevo ingreso para {formatMonthLabel(activeMonth)}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs font-bold underline text-slate-600 hover:text-black"
                >
                  Cancelar
                </button>
              </div>

              {/* Type selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INCOME_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleSelectNewType(t.value)}
                    className={`py-2 px-2 rounded-lg border-[2px] border-black text-xs font-black flex items-center justify-center gap-1 ${
                      newType === t.value
                        ? 'bg-[#FFE500] text-black shadow-[2px_2px_0px_#000]'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Nombre del ingreso
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Ej: Segundo Sueldo, Jubilación Mamá..."
                    className="w-full h-11 px-3 bg-white border-[2px] border-black rounded-lg text-sm font-bold text-black focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Monto ($ ARS)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="800000"
                    className="w-full h-11 px-3 bg-white border-[2px] border-black rounded-lg text-base font-black text-black focus:outline-none"
                    required
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 bg-white border-[2px] border-black p-2.5 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={newRepeats}
                  onChange={(e) => setNewRepeats(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#22C55E] cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  🔁 Repetir este ingreso automáticamente los meses siguientes
                </span>
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 bg-[#22C55E] text-black border-[2.5px] border-black rounded-xl font-black text-sm uppercase flex items-center justify-center gap-2 hover:bg-[#1eb353] shadow-[3px_3px_0px_#000] disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Agregar a este mes'}</span>
              </button>
            </form>
          )}

          {/* 3. Compact Monthly History */}
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
