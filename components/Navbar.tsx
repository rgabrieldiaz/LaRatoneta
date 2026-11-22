'use client';

import React from 'react';
import { ClipboardList, Radio, Download, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  onOpenBatchModal: () => void;
  onOpenIntegrations: () => void;
  onExportCSV: () => void;
  totalExpensesCount: number;
  pendingCount: number;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isConfigured: boolean;
  selectedMonthLabel?: string;
}

export function Navbar({
  onOpenBatchModal,
  onOpenIntegrations,
  onExportCSV,
  totalExpensesCount,
  pendingCount,
  user,
  onLogin,
  onLogout,
  isConfigured,
  selectedMonthLabel = 'Noviembre 2026',
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

          <div className="hidden sm:flex items-center px-2.5 py-1 bg-white border-[2px] border-black shadow-[2px_2px_0px_#000] rounded text-xs font-black uppercase tracking-tight">
            {selectedMonthLabel.toUpperCase()} 🗓️
          </div>
        </div>

        {/* Action Buttons & Auth */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pegar desde Keep */}
          <button
            onClick={onOpenBatchModal}
            className="brutal-btn bg-[#FF5376] text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-[#ff3b63]"
            title="Pegar lote de Google Keep"
          >
            <ClipboardList className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">PEGAR KEEP 📋</span>
            <span className="sm:hidden">KEEP</span>
          </button>

          {/* Sincronización Automática */}
          <button
            onClick={onOpenIntegrations}
            className="brutal-btn bg-white text-black px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-slate-100 relative"
            title="Canales de Ingesta (Apps, Mails, Notificaciones)"
          >
            <Radio className="w-4 h-4 text-[#22C55E]" />
            <span className="hidden sm:inline">SYNC</span>
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
          </button>

          {/* Google Auth Button / User Profile */}
          {user ? (
            <div className="flex items-center gap-2 bg-white border-[2px] border-black rounded px-2 py-1 shadow-[2px_2px_0px_#000]">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuario'}
                  className="w-6 h-6 rounded-full border border-black object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#00E5FF] border border-black flex items-center justify-center font-bold text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-black text-black max-w-[100px] truncate hidden md:inline">
                {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
              </span>
              <button
                onClick={onLogout}
                className="text-slate-500 hover:text-[#FF5376] transition-colors p-0.5"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="brutal-btn bg-white text-black px-3 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-slate-50"
              title="Iniciar con Google"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.98 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>LOGIN</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

