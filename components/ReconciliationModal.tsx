'use client';

import React, { useState, useMemo } from 'react';
import { Expense, Category, PaymentMethod, MerchantRulesMap } from '../lib/types';
import { parseLocalizedAmount, inferCategoryAndMethod } from '../lib/keepParser';
import { formatMonthLabel } from '../lib/dateUtils';
import { 
  X, 
  CheckCheck, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Sparkles, 
  ClipboardList, 
  CreditCard,
  Calendar,
  ArrowRight
} from 'lucide-react';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  selectedMonthKey: string;
  onImportExpenses: (expenses: Expense[]) => void;
  merchantRules?: MerchantRulesMap;
}

interface ParsedStatementItem {
  id: string;
  rawLine: string;
  date: string; // YYYY-MM-DD
  title: string;
  amount: number;
  category: Category;
  method: PaymentMethod;
  isExcluded: boolean;
  isMatched: boolean;
  matchedExpense?: Expense;
  selectedForImport: boolean;
}

const SAMPLE_STATEMENT = `12/11 COTO SUC 084 $38.500,00
15/11 FARMACITY 112 $14.200,00
16/11 CABIFY VIAJES $6.800,00
18/11 ESTAB 0918 PALERMO $21.500,00
20/11 DIA TIENDA ONLINE $18.400,00
22/11 SU PAGO EN PESOS -$99.400,00`;

const EXCLUDE_KEYWORDS = [
  'su pago',
  'pago de resumen',
  'pago recibido',
  'debito automatico',
  'pago en pesos',
  'transferencia recibida',
  'saldo anterior',
];

export function ReconciliationModal({
  isOpen,
  onClose,
  expenses,
  selectedMonthKey,
  onImportExpenses,
  merchantRules,
}: ReconciliationModalProps) {
  const [rawText, setRawText] = useState('');
  const [statementMethod, setStatementMethod] = useState<PaymentMethod>('CREDITO');
  const [targetMonth, setTargetMonth] = useState<string>(selectedMonthKey !== 'ALL' ? selectedMonthKey : '2026-11');
  const [filterView, setFilterView] = useState<'ALL' | 'UNMATCHED' | 'MATCHED'>('ALL');
  const [parsedItems, setParsedItems] = useState<ParsedStatementItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  if (!isOpen) return null;

  // Expenses of target month for matching
  const monthExpenses = expenses.filter((e) => e.date.startsWith(targetMonth));

  const handleParse = (textToParse = rawText) => {
    if (!textToParse.trim()) return;

    const lines = textToParse.split('\n').map((l) => l.trim()).filter(Boolean);
    const [targetYear, targetMonthNum] = targetMonth.split('-');

    const results: ParsedStatementItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Check if it's a payment or statement balancing line
      const isExcluded = EXCLUDE_KEYWORDS.some((kw) => lowerLine.includes(kw));

      // Extract Date (DD/MM or DD-MM or DD/MM/YY)
      const dateMatch = line.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
      let dayStr = '01';
      let monthStr = targetMonthNum;
      if (dateMatch) {
        dayStr = String(parseInt(dateMatch[1], 10)).padStart(2, '0');
        monthStr = String(parseInt(dateMatch[2], 10)).padStart(2, '0');
      }
      const itemDate = `${targetYear}-${monthStr}-${dayStr}`;

      // Extract Amount
      const numMatch = line.match(/(?:^|\s)-?\$?\s*([\d]+(?:[\.,]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d+)?)(?=\s|$)/);
      if (!numMatch) continue;

      const rawAmountStr = numMatch[1];
      const parsedAmount = parseLocalizedAmount(rawAmountStr);
      if (isNaN(parsedAmount) || parsedAmount <= 0) continue;

      // Extract Title
      let rawTitle = line
        .replace(numMatch[0], ' ')
        .replace(/\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/, ' ')
        .replace(/\b(?:tarj|tarjeta|pesos|ars|compra)\b/gi, ' ')
        .replace(/[^\w\sáéíóúÁÉÍÓÚñÑ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!rawTitle) {
        rawTitle = isExcluded ? 'Pago de Resumen' : 'Consumo Tarjeta';
      }

      const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
      const inferred = inferCategoryAndMethod(title, merchantRules);

      // Matching algorithm against current month's expenses
      let matchedExpense: Expense | undefined;

      if (!isExcluded) {
        // Step 1: Look for exact amount and similar date or title
        matchedExpense = monthExpenses.find((e) => {
          const amountDiff = Math.abs(e.amount - parsedAmount);
          if (amountDiff > 1) return false;

          // Check title similarity or date similarity
          const eTitle = e.title.toLowerCase();
          const pTitle = title.toLowerCase();
          const hasCommonWord = eTitle.split(' ').some((w) => w.length >= 4 && pTitle.includes(w));
          const dateDiffDays = Math.abs(
            (new Date(e.date).getTime() - new Date(itemDate).getTime()) / (1000 * 60 * 60 * 24)
          );

          return hasCommonWord || dateDiffDays <= 3;
        });

        // Step 2: Fallback to exact amount in the month if not matched yet
        if (!matchedExpense) {
          matchedExpense = monthExpenses.find((e) => Math.abs(e.amount - parsedAmount) <= 1);
        }
      }

      const isMatched = Boolean(matchedExpense);

      results.push({
        id: `stmt-${Date.now()}-${i}`,
        rawLine: line,
        date: itemDate,
        title,
        amount: parsedAmount,
        category: inferred.category,
        method: statementMethod,
        isExcluded,
        isMatched,
        matchedExpense,
        selectedForImport: !isMatched && !isExcluded,
      });
    }

    setParsedItems(results);
    setHasParsed(true);
  };

  const handleToggleSelect = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selectedForImport: !item.selectedForImport } : item))
    );
  };

  const handleUpdateItemCategory = (id: string, category: Category) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category } : item))
    );
  };

  const handleImportSelected = () => {
    const toImport = parsedItems
      .filter((item) => item.selectedForImport && !item.isExcluded && !item.isMatched)
      .map((item) => ({
        id: `reconciled-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: item.title,
        amount: item.amount,
        currency: 'ARS' as const,
        category: item.category,
        method: item.method,
        date: item.date,
        isConfirmed: true,
        source: 'MANUAL' as const,
        note: `Conciliación ${statementMethod === 'CREDITO' ? 'Tarjeta' : 'Resumen'}`,
      }));

    if (toImport.length === 0) {
      alert('No seleccionaste ningún gasto faltante para importar.');
      return;
    }

    onImportExpenses(toImport);
    onClose();
  };

  const activeItems = parsedItems.filter((i) => !i.isExcluded);
  const matchedCount = activeItems.filter((i) => i.isMatched).length;
  const unmatchedCount = activeItems.filter((i) => !i.isMatched).length;
  const selectedCount = activeItems.filter((i) => i.selectedForImport && !i.isMatched).length;

  const totalStatementARS = activeItems.reduce((sum, i) => sum + i.amount, 0);
  const totalUnmatchedARS = activeItems
    .filter((i) => !i.isMatched)
    .reduce((sum, i) => sum + i.amount, 0);

  const displayedItems = parsedItems.filter((item) => {
    if (item.isExcluded) return false;
    if (filterView === 'MATCHED') return item.isMatched;
    if (filterView === 'UNMATCHED') return !item.isMatched;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white border-[3.5px] border-black rounded-2xl shadow-[6px_6px_0px_#000] w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b-[2.5px] border-black pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#22C55E] border-[2px] border-black flex items-center justify-center shadow-[1.5px_1.5px_0px_#000]">
              <CheckCheck className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="font-black text-lg sm:text-xl uppercase tracking-tight text-black">
                Conciliación Asistida de Resúmenes
              </h2>
              <p className="text-xs font-bold text-slate-500">
                Auditá tu resumen de tarjeta o cuenta y detectá gastos olvidados
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

        {/* Configuration Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F8F8F8] border-[2px] border-black rounded-xl p-3 shadow-[2px_2px_0px_#000]">
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
              Mes a auditar
            </label>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="w-full h-10 px-3 bg-white border-[2px] border-black rounded-lg text-xs sm:text-sm font-black focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
              Método de pago del resumen
            </label>
            <select
              value={statementMethod}
              onChange={(e) => setStatementMethod(e.target.value as PaymentMethod)}
              className="w-full h-10 px-3 bg-white border-[2px] border-black rounded-lg text-xs sm:text-sm font-black focus:outline-none"
            >
              <option value="CREDITO">💳 Tarjeta de Crédito (Visa / Amex / Galicia)</option>
              <option value="CUENTA">⚡ En Cuenta / Débito / Billetera</option>
            </select>
          </div>
        </div>

        {/* Input Area */}
        {!hasParsed ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase text-slate-700">
                Pegá las líneas del resumen o extracto:
              </label>
              <button
                type="button"
                onClick={() => {
                  setRawText(SAMPLE_STATEMENT);
                  handleParse(SAMPLE_STATEMENT);
                }}
                className="text-xs font-black text-slate-600 underline hover:text-black flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cargar ejemplo de prueba</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Ej:
15/11 COTO SUC 084 $38.500,00
18/11 FARMACITY 112 $14.200,00
20/11 ESTAB 0918 PALERMO $21.500,00..."
              className="w-full p-3.5 bg-[#F8F8F8] border-[2.5px] border-black rounded-xl font-mono text-xs sm:text-sm focus:outline-none focus:bg-white"
            />

            <button
              type="button"
              onClick={() => handleParse()}
              disabled={!rawText.trim()}
              className="w-full py-3.5 bg-[#FFE500] hover:bg-yellow-400 disabled:opacity-50 text-black border-[3px] border-black rounded-xl font-black uppercase text-sm sm:text-base shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <CheckCheck className="w-5 h-5" />
              <span>Auditar y Comparar con Ratoneta</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Reconciliation Stats Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-slate-50 border-[2px] border-black rounded-xl">
                <span className="text-[10px] font-black uppercase text-slate-500 block">
                  Total Consumos
                </span>
                <span className="text-lg sm:text-xl font-black text-black block">
                  ${totalStatementARS.toLocaleString('es-AR')}
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  {activeItems.length} movimientos
                </span>
              </div>

              <div className="p-3 bg-emerald-50 border-[2px] border-emerald-400 rounded-xl">
                <span className="text-[10px] font-black uppercase text-emerald-800 block">
                  Conciliados ✅
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-800 block">
                  {matchedCount} de {activeItems.length}
                </span>
                <span className="text-[11px] font-bold text-emerald-700">
                  Ya anotados en Ratoneta
                </span>
              </div>

              <div className="p-3 bg-amber-50 border-[2px] border-amber-400 rounded-xl">
                <span className="text-[10px] font-black uppercase text-amber-800 block">
                  No Registrados ⚠️
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-800 block">
                  ${totalUnmatchedARS.toLocaleString('es-AR')}
                </span>
                <span className="text-[11px] font-bold text-amber-700">
                  {unmatchedCount} gastos olvidados
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200">
              <div className="inline-flex rounded-lg border-[2px] border-black overflow-hidden shadow-[2px_2px_0px_#000]">
                <button
                  type="button"
                  onClick={() => setFilterView('ALL')}
                  className={`px-3 py-1 text-xs font-black transition-colors ${
                    filterView === 'ALL' ? 'bg-[#FFE500] text-black' : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Todos ({activeItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterView('UNMATCHED')}
                  className={`px-3 py-1 text-xs font-black border-l-[2px] border-black transition-colors ${
                    filterView === 'UNMATCHED' ? 'bg-[#FF5376] text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ⚠️ Faltantes ({unmatchedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterView('MATCHED')}
                  className={`px-3 py-1 text-xs font-black border-l-[2px] border-black transition-colors ${
                    filterView === 'MATCHED' ? 'bg-[#22C55E] text-black' : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ✅ Conciliados ({matchedCount})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setHasParsed(false)}
                className="text-xs font-black underline text-slate-600 hover:text-black"
              >
                Pegar otro texto
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {displayedItems.length === 0 ? (
                <div className="p-6 bg-slate-50 border-[2px] border-black rounded-xl text-center">
                  <p className="font-black text-sm text-slate-600">
                    No hay movimientos en esta vista.
                  </p>
                </div>
              ) : (
                displayedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border-[2px] border-black shadow-[2px_2px_0px_#000] flex items-center justify-between gap-3 transition-colors ${
                      item.isMatched ? 'bg-emerald-50/60' : 'bg-amber-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {!item.isMatched && (
                        <input
                          type="checkbox"
                          checked={item.selectedForImport}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-4 h-4 rounded border-2 border-black text-[#22C55E] cursor-pointer"
                        />
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs sm:text-sm text-black truncate">
                            {item.title}
                          </span>
                          {item.isMatched ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-400">
                              ✅ Conciliado
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-400">
                              ⚠️ No registrado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 pt-0.5">
                          <span className="font-mono">{item.date}</span>
                          <span>•</span>
                          {!item.isMatched ? (
                            <select
                              value={item.category}
                              onChange={(e) => handleUpdateItemCategory(item.id, e.target.value as Category)}
                              className="bg-white border border-black rounded px-1.5 py-0.5 text-[10px] font-black cursor-pointer"
                            >
                              {[
                                'Supermercados',
                                'Frescos & Panadería',
                                'Comida & Salidas',
                                'Hogar & Servicios',
                                'Transporte',
                                'Salud & Farmacia',
                                'Cuidado & Varios',
                              ].map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span>{item.matchedExpense?.category || item.category}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-sm sm:text-base text-black block font-mono">
                        ${item.amount.toLocaleString('es-AR')}
                      </span>
                      {item.isMatched && item.matchedExpense && (
                        <span className="text-[10px] font-bold text-emerald-700 block truncate max-w-[140px]">
                          Matched: {item.matchedExpense.title}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Action Footer */}
            {unmatchedCount > 0 && (
              <div className="pt-3 border-t-[2px] border-black flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-700">
                  {selectedCount} de {unmatchedCount} seleccionados para agregar a Ratoneta
                </span>

                <button
                  type="button"
                  onClick={handleImportSelected}
                  disabled={selectedCount === 0}
                  className="px-5 py-2.5 bg-[#22C55E] hover:bg-[#1eb353] disabled:opacity-40 text-black border-[2px] border-black rounded-xl font-black uppercase text-xs sm:text-sm shadow-[2.5px_2.5px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar {selectedCount} {selectedCount === 1 ? 'gasto' : 'gastos'} a Ratoneta</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
