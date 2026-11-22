'use client';

import React, { useState } from 'react';
import { parseRawKeepText } from '../lib/keepParser';
import { FALLBACK_DOLAR_MEP } from '../lib/dolarApi';
import { Expense, MerchantRulesMap } from '../lib/types';
import { X, ClipboardList, Sparkles, Check, ArrowRight, AlertCircle } from 'lucide-react';

interface KeepBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportExpenses: (expenses: Expense[]) => void;
  merchantRules?: MerchantRulesMap;
}

const SAMPLE_NOTES = `Chino 19510 efectivo
Cabify 18940 mp
Comida al peso 14520 efectivo
Farmacia 9700 cuenta
Verdulería 13000 efectivo
Carrefour 10000 ripio
Big Pons 23200 credito`;

export function KeepBatchModal({ isOpen, onClose, onImportExpenses, merchantRules }: KeepBatchModalProps) {
  const [text, setText] = useState('');
  const [previewExpenses, setPreviewExpenses] = useState<Expense[]>([]);
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleTextChange = (val: string, dateToUse = batchDate) => {
    setText(val);
    const parsed = parseRawKeepText(val, FALLBACK_DOLAR_MEP, merchantRules);
    setPreviewExpenses(parsed.map(p => ({ ...p, date: dateToUse })));
  };

  const handleDateChange = (newDate: string) => {
    setBatchDate(newDate);
    setPreviewExpenses(prev => prev.map(p => ({ ...p, date: newDate })));
  };

  const handleLoadSample = () => {
    handleTextChange(SAMPLE_NOTES, batchDate);
  };

  const handleImport = () => {
    if (previewExpenses.length === 0) {
      alert('No se detectaron gastos válidos en el texto.');
      return;
    }
    onImportExpenses(previewExpenses);
    onClose();
  };

  const totalARS = previewExpenses
    .filter(e => e.currency === 'ARS')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalUSD = previewExpenses
    .filter(e => e.currency === 'USD')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white border-[4px] border-black shadow-[6px_6px_0px_#000] rounded-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#FFE500] border-b-[3.5px] border-black px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-black" />
            <h3 className="font-black text-base uppercase tracking-tight">CARGA MASIVA DE GASTOS</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white border-[2px] border-black rounded shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-bold text-slate-700">
              Pegá una lista de gastos (una línea por gasto, opcionalmente aclarando el método):
            </p>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-black uppercase text-slate-700">Fecha del lote:</label>
              <input
                type="date"
                value={batchDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-white border-[2px] border-black rounded px-2 py-0.5 text-xs font-bold shadow-[1.5px_1.5px_0px_#000]"
              />
              <button
                onClick={handleLoadSample}
                className="px-2.5 py-1 bg-[#00E5FF] border-[2px] border-black rounded text-[11px] font-black uppercase shadow-[2px_2px_0px_#000] hover:bg-[#00cbe2]"
              >
                ⚡ Cargar lista de prueba
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              rows={8}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Chino 19510&#10;Cabify 18940&#10;Comida 26000&#10;Tarjeta 0,99 dol&#10;Expensas 256456..."
              className="w-full p-3 font-mono text-xs bg-[#F9F9F9] border-[3px] border-black rounded-lg focus:outline-none focus:bg-white shadow-[2px_2px_0px_#000]"
            />
          </div>

          {/* Live Preview Box */}
          {previewExpenses.length > 0 && (
            <div className="space-y-3">
              <div className="p-3 bg-[#FFE500] border-[2.5px] border-black rounded-lg shadow-[2px_2px_0px_#000] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black uppercase block">RESULTADO DEL PARSER IA:</span>
                  <span className="text-sm font-bold text-slate-800">
                    {previewExpenses.length} gastos detectados
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-black block">
                    ${totalARS.toLocaleString('es-AR')} ARS
                  </span>
                  {totalUSD > 0 && (
                    <span className="text-xs font-black text-[#FF5376] block">
                      + ${totalUSD.toFixed(2)} USD
                    </span>
                  )}
                </div>
              </div>

              {/* Preview table of first 10 items */}
              <div className="border-[2px] border-black rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b-[2px] border-black font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Concepto</th>
                      <th className="p-2">Categoría</th>
                      <th className="p-2">Medio</th>
                      <th className="p-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/20 font-bold">
                    {previewExpenses.map((e, idx) => (
                      <tr key={idx} className="hover:bg-yellow-50">
                        <td className="p-2">{e.title}</td>
                        <td className="p-2 text-slate-600">{e.category}</td>
                        <td className="p-2 text-slate-600">{e.method}</td>
                        <td className="p-2 text-right font-black">
                          {e.currency === 'USD' ? `U$S ${e.amount}` : `$${e.amount.toLocaleString('es-AR')}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t-[3.5px] border-black p-3 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border-[2px] border-black rounded font-bold text-xs uppercase shadow-[2px_2px_0px_#000]"
          >
            Cancelar
          </button>

          <button
            onClick={handleImport}
            disabled={previewExpenses.length === 0}
            className={`px-5 py-2.5 rounded font-black text-xs uppercase flex items-center gap-1.5 border-[3px] border-black shadow-[3px_3px_0px_#000] transition-all ${
              previewExpenses.length > 0
                ? 'bg-[#22C55E] text-black hover:bg-[#1eb354] active:translate-x-1 active:translate-y-1'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>IMPORTAR TODOS ({previewExpenses.length}) 🚀</span>
          </button>
        </div>

      </div>
    </div>
  );
}
