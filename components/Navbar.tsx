'use client';

import React from 'react';
import { ClipboardList, Radio, Download, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenBatchModal: () => void;
  onOpenIntegrations: () => void;
  onExportCSV: () => void;
  totalExpensesCount: number;
  pendingCount: number;
}

export function Navbar({
  onOpenBatchModal,
  onOpenIntegrations,
  onExportCSV,
  totalExpensesCount,
  pendingCount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-[#FFE500] border-b-[3.5px] border-black px-4 py-3">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="bg-white border-[3px] border-black shadow-[3px_3px_0px_#000] px-3 py-1 rounded-lg flex items-center gap-2.5">
            <img src="/ratita.svg" alt="Ratita Tierna" className="w-8 h-8 rounded shrink-0 object-contain" />
            <div>
              <span className="font-extrabold text-lg tracking-tight uppercase block leading-none">LA RATONETA</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">EXPENSE TRACKER 🧀</span>
            </div>
            <span className="bg-[#22C55E] text-black text-[10px] font-black px-1.5 py-0.5 rounded border border-black uppercase ml-1">
              LIVE
            </span>
          </div>

          <div className="hidden sm:flex items-center px-2.5 py-1 bg-white border-[2px] border-black shadow-[2px_2px_0px_#000] rounded text-xs font-bold uppercase">
            NOV 2026 🗓️
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pegar desde Keep */}
          <button
            onClick={onOpenBatchModal}
            className="brutal-btn bg-[#FF5376] text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-[#ff3b63]"
            title="Pegar lote de Google Keep"
          >
            <ClipboardList className="w-4 h-4 text-white" />
            <span>PEGAR DESDE KEEP 📋</span>
          </button>

          {/* Sincronización Automática */}
          <button
            onClick={onOpenIntegrations}
            className="brutal-btn bg-white text-black px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-slate-100 relative"
            title="Canales de Ingesta (Apps, Mails, Notificaciones)"
          >
            <Radio className="w-4 h-4 text-[#22C55E]" />
            <span>AUTO-SYNC</span>
            {pendingCount > 0 && (
              <span className="w-2.5 h-2.5 bg-[#FF5376] rounded-full border border-black animate-ping absolute -top-1 -right-1" />
            )}
          </button>

          {/* Exportar CSV */}
          <button
            onClick={onExportCSV}
            className="brutal-btn bg-white text-black px-2.5 py-1.5 rounded text-xs flex items-center gap-1 hover:bg-slate-100"
            title="Exportar a Excel / CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
}
