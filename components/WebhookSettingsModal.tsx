'use client';

import React, { useState, useEffect } from 'react';
import { X, Smartphone, Mic, Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react';

interface WebhookSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WebhookSettingsModal({ isOpen, onClose }: WebhookSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'APPLE_PAY' | 'SIRI'>('APPLE_PAY');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [serverStatus, setServerStatus] = useState<{
    configured: boolean;
    firestoreAdmin: boolean;
    webhookSecret: boolean;
  } | null>(null);

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhook`
      : 'https://la-ratoneta.vercel.app/api/webhook';

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/webhook')
      .then((r) => r.json())
      .then((data) => {
        setServerStatus({
          configured: Boolean(data.configured),
          firestoreAdmin: Boolean(data.firestoreAdmin),
          webhookSecret: Boolean(data.webhookSecret),
        });
      })
      .catch(() => setServerStatus(null));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-lg bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] rounded-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#FFE500] border-b-[3.5px] border-black px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white border-[2px] border-black rounded-lg shadow-[2px_2px_0px_#000]">
              <Smartphone className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg uppercase tracking-tight text-black leading-none">
                ATAJOS IPHONE (FASE 1)
              </h3>
              <span className="text-xs font-bold text-slate-800">
                Apple Pay automático y dictado con Siri
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
          
          {/* Server Connection Status */}
          {serverStatus && (
            <div
              className={`p-3 rounded-xl border-[2px] border-black text-xs font-bold flex items-start gap-2.5 ${
                serverStatus.configured ? 'bg-[#22C55E]/20' : 'bg-[#FFF9D2]'
              }`}
            >
              {serverStatus.configured ? (
                <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <span className="font-black block text-black">
                  {serverStatus.configured
                    ? '✅ Servidor listo para recibir gastos del iPhone'
                    : '⏳ Faltan credenciales del servidor en Vercel'}
                </span>
                {!serverStatus.configured && (
                  <span className="text-[11px] text-slate-700 block">
                    {!serverStatus.firestoreAdmin && '• Falta FIREBASE_SERVICE_ACCOUNT_KEY '}
                    {!serverStatus.webhookSecret && '• Falta WEBHOOK_SECRET'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Webhook URL Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase text-slate-700">
              URL del Webhook (para pegar en Atajos):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 h-10 px-3 bg-[#F8F8F8] border-[2px] border-black rounded-lg font-mono text-xs font-bold text-slate-800"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="h-10 px-3 bg-[#00E5FF] border-[2px] border-black rounded-lg text-xs font-black flex items-center gap-1 shadow-[2px_2px_0px_#000] hover:bg-[#00cbe2] shrink-0"
              >
                {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedUrl ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Guide Tabs */}
          <div className="flex bg-[#F8F8F8] border-[2px] border-black rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('APPLE_PAY')}
              className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'APPLE_PAY'
                  ? 'bg-[#FFE500] text-black border border-black shadow-[2px_2px_0px_#000]'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Apple Pay Automático</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('SIRI')}
              className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'SIRI'
                  ? 'bg-[#FFE500] text-black border border-black shadow-[2px_2px_0px_#000]'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Dictado con Siri</span>
            </button>
          </div>

          {activeTab === 'APPLE_PAY' ? (
            <div className="space-y-3 text-xs text-slate-800 bg-[#F8F8F8] border-[2px] border-black rounded-xl p-4">
              <p className="font-black uppercase text-black">
                Configuración en el iPhone de Gretel (3 minutos):
              </p>
              <ol className="list-decimal pl-4 space-y-2 font-medium leading-relaxed">
                <li>
                  Abrí la app <strong>Atajos (Shortcuts)</strong> → pestaña <strong>Automatización</strong> → tocá <strong>+</strong>.
                </li>
                <li>
                  Elegí <strong>Transacción (Wallet)</strong>, seleccioná sus tarjetas (Galicia Visa, Ripio, etc.) y marcá <strong>Ejecutar inmediatamente</strong>.
                </li>
                <li>
                  Agregá la acción <strong>Obtener contenido de URL</strong>:
                  <ul className="list-disc pl-4 mt-1 font-mono text-[11px] bg-white border border-black rounded p-2 space-y-0.5">
                    <li>Método: <strong>POST</strong> | Cuerpo: <strong>JSON</strong></li>
                    <li><code>merchant</code> → Variable: Comercio</li>
                    <li><code>amount</code> → Variable: Monto</li>
                    <li><code>card</code> → Variable: Tarjeta o pase</li>
                    <li><code>secret</code> → Tu clave <code>WEBHOOK_SECRET</code></li>
                  </ul>
                </li>
                <li>
                  Agregá <strong>Obtener valor de diccionario</strong> (clave: <code>notification</code>) y después <strong>Mostrar notificación</strong> con ese resultado.
                </li>
              </ol>
              <p className="text-[11px] font-bold text-slate-600 pt-1">
                💡 Si la tarjeta dice <strong>Ripio</strong> se guarda en <em>En Cuenta</em>; si dice <strong>Visa/Galicia/Amex</strong> se guarda en <em>Crédito</em>.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-slate-800 bg-[#F8F8F8] border-[2px] border-black rounded-xl p-4">
              <p className="font-black uppercase text-black">
                Atajo de voz para gastos en Efectivo:
              </p>
              <ol className="list-decimal pl-4 space-y-2 font-medium leading-relaxed">
                <li>
                  En <strong>Atajos</strong> → tocá <strong>+</strong> y renombralo a <strong>&quot;Anotar en Ratoneta&quot;</strong>.
                </li>
                <li>
                  Agregá <strong>Dictar texto</strong> (o <em>Solicitar entrada</em>) → pregunta: <em>&quot;¿Qué gastaste?&quot;</em>.
                </li>
                <li>
                  Agregá <strong>Obtener contenido de URL</strong> (POST JSON a la URL de arriba):
                  <ul className="list-disc pl-4 mt-1 font-mono text-[11px] bg-white border border-black rounded p-2 space-y-0.5">
                    <li><code>text</code> → Variable: Texto dictado</li>
                    <li><code>secret</code> → Tu clave <code>WEBHOOK_SECRET</code></li>
                  </ul>
                </li>
                <li>
                  Agregá <strong>Mostrar notificación</strong> con el valor de <code>notification</code> de la respuesta.
                </li>
              </ol>
              <p className="text-[11px] font-bold text-slate-600 pt-1">
                🎙️ Listo: dice <em>&quot;Oye Siri, Anotar en Ratoneta&quot;</em> → <em>&quot;Chino 4500 efectivo&quot;</em> y se guarda solo.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
