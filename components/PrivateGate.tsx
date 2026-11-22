'use client';

import React from 'react';
import { User } from 'firebase/auth';
import { ShieldCheck, Lock, LogOut, ArrowRight, ExternalLink, RefreshCw } from 'lucide-react';

interface PrivateGateProps {
  user: User | null;
  authorizedEmails: string[];
  onLogin: () => void;
  onLoginRedirect: () => void;
  onLogout: () => void;
  isConfigured: boolean;
  errorMessage?: string | null;
}

export function PrivateGate({
  user,
  authorizedEmails,
  onLogin,
  onLoginRedirect,
  onLogout,
  errorMessage,
}: PrivateGateProps) {
  const isWrongUser = Boolean(
    user && 
    user.email && 
    !authorizedEmails.map(e => e.trim().toLowerCase()).includes(user.email.trim().toLowerCase())
  );

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
            ACCESO PRIVADO • ENCRIPTADO
          </span>
          <h1 className="text-3xl font-black tracking-tight uppercase text-black pt-2">
            LA RATONETA 🧀
          </h1>
          <p className="text-xs font-bold text-slate-600">
            Control Privado de Gastos Diarios
          </p>
        </div>

        {/* Privacy Explanation */}
        <div className="bg-[#FFF9D2] border-[2px] border-black p-3.5 rounded-lg text-left space-y-2">
          <div className="flex items-center gap-1.5 font-black text-xs text-black">
            <ShieldCheck className="w-4 h-4 text-[#22C55E]" />
            <span>BÓVEDA DE ACCESO RESTRINGIDO</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Esta es una aplicación privada para el registro y análisis de consumos personales. Para proteger la intimidad de los datos, el acceso está reservado exclusivamente a las cuentas autorizadas.
          </p>
        </div>

        {/* Optional Error Display Banner */}
        {errorMessage && (
          <div className="bg-[#FF5376]/10 border-[2px] border-[#FF5376] p-3 rounded-lg text-left space-y-1">
            <p className="text-xs font-black text-[#FF5376] uppercase">
              ⚠️ Nota de inicio de sesión:
            </p>
            <p className="text-xs text-slate-800 break-words font-mono">
              {errorMessage}
            </p>
            {errorMessage.includes('popup') && (
              <p className="text-[11px] text-slate-600 font-bold mt-1">
                💡 Consejo: Si tu navegador bloqueó la ventana emergente, probá el botón de <strong>"Ingresar por Redirección Directa"</strong> abajo.
              </p>
            )}
          </div>
        )}

        {/* Unauthorized user state */}
        {isWrongUser ? (
          <div className="bg-[#FF5376]/10 border-[2px] border-[#FF5376] p-4 rounded-lg space-y-3 text-left">
            <p className="text-xs font-black text-[#FF5376] uppercase flex items-center gap-1.5">
              <span>🚫 CUENTA NO AUTORIZADA</span>
            </p>
            <p className="text-xs text-slate-800">
              Iniciaste sesión con <strong className="font-mono">{user?.email}</strong>. Esta cuenta no cuenta con permisos para acceder a esta bóveda.
            </p>
            <button
              onClick={onLogout}
              className="brutal-btn w-full bg-[#FF5376] text-white py-2.5 px-4 rounded text-xs font-black flex items-center justify-center gap-2 hover:bg-[#e03a5e]"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión e ingresar con la cuenta autorizada</span>
            </button>
          </div>
        ) : (
          /* Normal Login state with 2 options */
          <div className="space-y-3">
            {/* Primary Popup Login */}
            <button
              onClick={onLogin}
              className="brutal-btn w-full bg-[#22C55E] text-black py-4 px-5 rounded-xl font-black text-sm uppercase flex items-center justify-center gap-3 hover:bg-[#1eb353] transition-transform active:scale-95 shadow-[4px_4px_0px_#000]"
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
              <span>Continuar con Google</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>

            {/* Alternative Direct Redirect Login (bypasses popups 100%) */}
            <button
              onClick={onLoginRedirect}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border-[2px] border-black rounded-lg text-xs font-black text-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_#000] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>O ingresar por Redirección Directa (Sin popups)</span>
            </button>

            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              🔒 Autenticación cifrada vía Google OAuth
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
            ☁️ Sincronización en Tiempo Real
          </div>
        </div>

      </div>
    </div>
  );
}
