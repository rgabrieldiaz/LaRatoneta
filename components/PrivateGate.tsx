'use client';

import React from 'react';
import { User } from 'firebase/auth';
import { ShieldCheck, Lock, LogOut, ArrowRight, Sparkles } from 'lucide-react';

interface PrivateGateProps {
  user: User | null;
  authorizedEmail: string;
  onLogin: () => void;
  onLogout: () => void;
  isConfigured: boolean;
}

export function PrivateGate({
  user,
  authorizedEmail,
  onLogin,
  onLogout,
  isConfigured
}: PrivateGateProps) {
  const isWrongUser = user && user.email?.toLowerCase() !== authorizedEmail.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFE500] p-4 sm:p-6">
      <div className="max-w-md w-full brutal-card p-6 sm:p-8 space-y-6 text-center bg-white border-[4px] border-black shadow-[8px_8px_0px_#000]">
        
        {/* Mascot & Lock Badge */}
        <div className="relative inline-block mx-auto">
          <div className="w-24 h-24 bg-[#FFE500] rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_#000] p-3 flex items-center justify-center mx-auto">
            <img 
              src="/ratita.svg" 
              alt="La Ratoneta" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-[#FF5376] text-white p-2 rounded-full border-[2px] border-black shadow-[2px_2px_0px_#000]">
            <Lock className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="text-[11px] font-black uppercase tracking-widest bg-black text-[#FFE500] px-2 py-0.5 rounded">
            FINANZAS PERSONALES • PRIVADO
          </span>
          <h1 className="text-3xl font-black tracking-tight uppercase text-black pt-2">
            LA RATONETA 🧀
          </h1>
          <p className="text-xs font-bold text-slate-600">
            Bóveda de Control de Gastos Diarios
          </p>
        </div>

        {/* Privacy Explanation */}
        <div className="bg-[#FFF9D2] border-[2px] border-black p-3.5 rounded-lg text-left space-y-2">
          <div className="flex items-center gap-1.5 font-black text-xs text-black">
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
            <span>ACCESO EXCLUSIVO Y PROTEGIDO</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Para proteger la intimidad financiera de <strong>Gretel</strong>, los gastos de chinos, comidas, tarjetas y expensas están cifrados y solo se muestran tras identificarse con su cuenta de Google.
          </p>
        </div>

        {/* Unauthorized user state */}
        {isWrongUser ? (
          <div className="bg-[#FF5376]/10 border-[2px] border-[#FF5376] p-4 rounded-lg space-y-3 text-left">
            <p className="text-xs font-black text-[#FF5376] uppercase">
              🚫 Cuenta no autorizada
            </p>
            <p className="text-xs text-slate-800">
              Iniciaste sesión como <strong>{user?.email}</strong>. Por seguridad e intimidad, esta app le pertenece exclusivamente a:
            </p>
            <div className="bg-white border border-black px-2.5 py-1 rounded text-xs font-mono font-bold text-black break-all">
              {authorizedEmail}
            </div>
            <button
              onClick={onLogout}
              className="brutal-btn w-full bg-[#FF5376] text-white py-2.5 px-4 rounded text-xs font-black flex items-center justify-center gap-2 hover:bg-[#e03a5e]"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión e ingresar con otra cuenta</span>
            </button>
          </div>
        ) : (
          /* Normal Login state */
          <div className="space-y-4">
            <button
              onClick={onLogin}
              className="brutal-btn w-full bg-[#22C55E] text-black py-4 px-5 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-3 hover:bg-[#1eb353] transition-transform active:scale-95"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>Entrar con Google</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>

            <p className="text-[11px] font-bold text-slate-500">
              Autorizado para: <span className="text-black font-mono underline">{authorizedEmail}</span>
            </p>
          </div>
        )}

        {/* Feature summary pills */}
        <div className="pt-2 border-t-[2px] border-slate-200 grid grid-cols-2 gap-2 text-left">
          <div className="p-2 bg-slate-50 border border-black rounded text-[10px] font-bold text-slate-700">
            📊 Gráfico de Torta por Categoría
          </div>
          <div className="p-2 bg-slate-50 border border-black rounded text-[10px] font-bold text-slate-700">
            🗓️ Análisis Mes a Mes
          </div>
          <div className="p-2 bg-slate-50 border border-black rounded text-[10px] font-bold text-slate-700">
            💵 Efectivo vs Tarjetas
          </div>
          <div className="p-2 bg-slate-50 border border-black rounded text-[10px] font-bold text-slate-700">
            ☁️ Guardado en Firebase
          </div>
        </div>

      </div>
    </div>
  );
}
