'use client';

import React from 'react';
import { Expense } from '../lib/types';
import { Check, X, Bell, QrCode, Mail, Smartphone, Info } from 'lucide-react';

interface InboxPendingProps {
  pendingExpenses: Expense[];
  onConfirm: (expense: Expense) => void;
  onReject: (id: string) => void;
  onSimulatePush: () => void;
}

export function InboxPending({
  pendingExpenses,
  onConfirm,
  onReject,
  onSimulatePush,
}: InboxPendingProps) {
  if (pendingExpenses.length === 0) {
    return (
      <div className="w-full bg-white border-[3px] border-black rounded-lg p-3 shadow-[3px_3px_0px_#000] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#22C55E] border-2 border-black rounded flex items-center justify-center">
            <Check className="w-4 h-4 text-black" />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-slate-800">BANDEJA AL DÍA</span>
            <p className="text-[11px] text-slate-500 font-bold">No hay pagos automáticos pendientes de confirmar.</p>
          </div>
        </div>
        <button
          onClick={onSimulatePush}
          className="text-[11px] font-black uppercase px-2 py-1 bg-[#FFE500] border-[1.5px] border-black rounded shadow-[1.5px_1.5px_0px_#000] hover:bg-[#ebd300]"
        >
          ⚡ Simular Notificación MP
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="brutal-badge bg-[#22C55E] text-black px-2.5 py-0.5 flex items-center gap-1">
            <Bell className="w-3.5 h-3.5 fill-black" />
            <span>{pendingExpenses.length} AUTOMÁTICOS PENDIENTES</span>
          </span>
          <span className="text-[11px] font-bold text-slate-700 hidden sm:inline">
            (Detectados por notificación push o email)
          </span>
        </div>

        <button
          onClick={onSimulatePush}
          className="text-[10px] font-black uppercase px-2 py-0.5 bg-white border-[1.5px] border-black rounded shadow-[1px_1px_0px_#000] hover:bg-slate-50"
        >
          + Probar Push
        </button>
      </div>

      {/* Horizontal rail / Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {pendingExpenses.map((exp) => (
          <div
            key={exp.id}
            className="min-w-[260px] max-w-[280px] bg-white border-[3px] border-black rounded-lg p-3 shadow-[3px_3px_0px_#000] flex flex-col justify-between shrink-0"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.2 bg-[#00E5FF] text-black border border-black text-[9px] font-black rounded uppercase">
                  {exp.source === 'EMAIL' ? '📧 EMAIL' : '📱 PUSH MP / QR'}
                </span>
                <button
                  onClick={() => onReject(exp.id)}
                  className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-black hover:bg-slate-100 rounded"
                  title="Descartar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h4 className="font-black text-sm text-black truncate">{exp.title}</h4>
                <p className="text-lg font-black text-[#FF5376]">
                  ${exp.amount.toLocaleString('es-AR')} {exp.currency}
                </p>
              </div>

              {exp.note && (
                <p className="text-[10px] text-slate-500 font-bold truncate">
                  {exp.note}
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => onConfirm(exp)}
                className="flex-1 py-1.5 bg-[#22C55E] text-black font-black text-xs uppercase border-[2px] border-black rounded shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1 hover:bg-[#1fb853]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>CONFIRMAR</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
