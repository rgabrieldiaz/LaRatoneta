'use client';

import React from 'react';
import { User } from 'firebase/auth';
import { ShieldCheck, Cloud, AlertTriangle, LogIn, ExternalLink } from 'lucide-react';

interface AuthBannerProps {
  user: User | null;
  isConfigured: boolean;
  onLogin: () => void;
  authorizedEmail?: string;
}

export function AuthBanner({
  user,
  isConfigured,
  onLogin,
  authorizedEmail = 'gretelfabregas@gmail.com',
}: AuthBannerProps) {
  // If Firebase is not yet configured with env vars in Vercel
  if (!isConfigured) {
    return (
      <div className="w-full bg-[#FFE500] border-[3px] border-black rounded-lg p-3.5 shadow-[3px_3px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-white border-2 border-black flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-[#FF5376]" />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-black block">
              FIREBASE PENDIENTE DE CONFIGURACIÓN
            </span>
            <p className="text-[11px] text-slate-800 font-bold leading-tight">
              Los gastos se guardan en tu navegador localmente. Para activar el login de Google y guardar en la nube de <strong>{authorizedEmail}</strong>, pega las variables en Vercel.
            </p>
          </div>
        </div>

        <a
          href="https://console.firebase.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="brutal-btn bg-white text-black px-3 py-1.5 rounded text-xs shrink-0 flex items-center gap-1.5 hover:bg-slate-50"
        >
          <span>Consola Firebase</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  // If user is not logged in
  if (!user) {
    return (
      <div className="w-full bg-white border-[3.5px] border-black rounded-lg p-4 shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FFE500] border-2 border-black flex items-center justify-center shrink-0">
            <Cloud className="w-5 h-5 text-black" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-black">
              SINCRONIZACIÓN EN LA NUBE ☁️
            </h4>
            <p className="text-xs text-slate-700 font-bold mt-0.5">
              Iniciá sesión con tu cuenta de Google (<strong>{authorizedEmail}</strong>) para guardar tus gastos en Firebase y no perderlos nunca.
            </p>
          </div>
        </div>

        <button
          onClick={onLogin}
          className="brutal-btn bg-[#22C55E] text-black px-4 py-2 rounded-lg text-xs font-black uppercase flex items-center gap-2 shrink-0 hover:bg-[#1fb352]"
        >
          <LogIn className="w-4 h-4" />
          <span>INICIAR CON GOOGLE</span>
        </button>
      </div>
    );
  }

  // If user is logged in
  const isAuthorized = user.email?.toLowerCase() === authorizedEmail.toLowerCase();

  return (
    <div className={`w-full border-[3px] border-black rounded-lg p-3 shadow-[3px_3px_0px_#000] flex items-center justify-between flex-wrap gap-2 ${
      isAuthorized ? 'bg-white' : 'bg-[#FF5376] text-white'
    }`}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#22C55E] border-2 border-black flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4 text-black" />
        </div>
        <div>
          <span className="text-xs font-black uppercase block">
            {isAuthorized ? 'CONECTADO A FIREBASE 🧀' : 'USUARIO NO AUTORIZADO'}
          </span>
          <p className="text-[11px] font-bold opacity-80">
            {isAuthorized 
              ? `Tus gastos están sincronizados en tiempo real en la cuenta de ${user.email}` 
              : `Has iniciado sesión como ${user.email}. Esta app es exclusiva para ${authorizedEmail}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="brutal-badge bg-[#22C55E] text-black px-2 py-0.5">
          FIRESTORE ONLINE
        </span>
      </div>
    </div>
  );
}
