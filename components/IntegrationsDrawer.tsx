'use client';

import React, { useState } from 'react';
import { X, Smartphone, Mail, Send, CheckCircle2, Copy, ExternalLink, ShieldCheck } from 'lucide-react';

interface IntegrationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationsDrawer({ isOpen, onClose }: IntegrationsDrawerProps) {
  const [copiedScript, setCopiedScript] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const sampleAppsScript = `// Google Apps Script para extraer facturas de Gmail
function parseExpenseEmails() {
  const webhookUrl = "https://tu-app-mis-gastos.vercel.app/api/webhook";
  const threads = GmailApp.search("label:gastos newer_than:1d");

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      const subject = msg.getSubject();
      const body = msg.getPlainBody();

      // Ejemplo: detectar Uber / Cabify / Personal
      const match = body.match(/Total[:\\s]*\\$([\\d\\.,]+)/i);
      if (match) {
        const amount = parseFloat(match[1].replace(/\\./g, '').replace(',', '.'));
        UrlFetchApp.fetch(webhookUrl, {
          method: "post",
          contentType: "application/json",
          payload: JSON.stringify({
            title: subject.slice(0, 30),
            amount: amount,
            currency: "ARS",
            source: "EMAIL"
          })
        });
      }
    });
  });
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white border-[4px] border-black shadow-[6px_6px_0px_#000] rounded-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#FFE500] border-b-[3.5px] border-black px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-black" />
            <h3 className="font-black text-base uppercase tracking-tight">
              ESTRATEGIA DE INGESTA AUTOMÁTICA &quot;ON STEROIDS&quot; ⚡
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center bg-white border-[2px] border-black rounded shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6">
          {/* Banner Context Argentina */}
          <div className="p-3 bg-[#FFE500]/30 border-[2.5px] border-black rounded-lg">
            <h4 className="font-black text-xs uppercase mb-1">
              ¿Por qué no hay una API directa de Mercado Pago o Bancos?
            </h4>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              En Argentina, ni Mercado Pago, ni MODO, ni los bancos otorgan APIs abiertas para cuentas personales por regulaciones de seguridad del BCRA. Sin embargo, <strong>la forma 100% legal, segura y automática de capturarlos</strong> es a través de 3 canales complementarios:
            </p>
          </div>

          {/* Canal 1: Notificaciones Android */}
          <div className="border-[3px] border-black rounded-lg p-4 bg-[#F9F9F9] shadow-[3px_3px_0px_#000] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[#22C55E] border-2 border-black flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase">Canal 1: Notificaciones Push (Android con MacroDroid)</h4>
                  <span className="text-[11px] font-bold text-[#22C55E]">Automático • 0 clics para pagos QR y transferencias</span>
                </div>
              </div>
              <span className="brutal-badge bg-[#22C55E] text-black px-2 py-0.5">RECOMENDADO</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Cada vez que paga con <strong>QR de Mercado Pago, MODO o tarjeta en el celular</strong>, la app emite una notificación (&quot;Pagaste $14.520 en Big Pons&quot;).
              La app <strong>MacroDroid</strong> (gratis en Play Store) captura esa notificación y dispara un Webhook a tu aplicación.
            </p>

            <div className="bg-white border-2 border-black rounded p-3 text-xs space-y-1">
              <p className="font-black uppercase text-[10px] text-slate-600">Configuración en MacroDroid (tarda 3 minutos):</p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                <li><strong>Disparador (Trigger):</strong> Notificación recibida de &quot;Mercado Pago&quot; o &quot;MODO&quot;.</li>
                <li><strong>Filtro:</strong> Contiene &quot;Pagaste&quot; o &quot;Enviaste&quot;.</li>
                <li><strong>Acción:</strong> Solicitud HTTP POST a <code className="bg-slate-200 px-1 rounded font-bold">https://tu-app.vercel.app/api/webhook</code> con el texto de la notificación.</li>
                <li><strong>Resultado en la Web App:</strong> El gasto cae automáticamente en la <em>Bandeja de Pendientes</em> para confirmar con un solo tap.</li>
              </ul>
            </div>
          </div>

          {/* Canal 2: Emails y Facturas */}
          <div className="border-[3px] border-black rounded-lg p-4 bg-[#F9F9F9] shadow-[3px_3px_0px_#000] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[#00E5FF] border-2 border-black flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4 text-black" />
                </div>
                <div>
                  <h4 className="font-black text-sm uppercase">Canal 2: Facturas y Comprobantes de Gmail</h4>
                  <span className="text-[11px] font-bold text-[#00a3b5]">Para Personal, Cabify, Uber, Expensas</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Los servicios mensuales fijos y viajes de apps envían recibo por correo. Con un Google Apps Script gratuito vinculado a su cuenta de Gmail, cada mail etiquetado como <code>gastos</code> se procesa solo.
            </p>

            <div className="relative">
              <button
                onClick={() => copyToClipboard(sampleAppsScript)}
                className="absolute top-2 right-2 px-2 py-1 bg-white border border-black rounded text-[10px] font-black uppercase flex items-center gap-1 shadow-[1px_1px_0px_#000]"
              >
                {copiedScript ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript ? 'Copiado!' : 'Copiar Script'}</span>
              </button>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-36">
                {sampleAppsScript}
              </pre>
            </div>
          </div>

          {/* Canal 3: Chinos, Verdulerías y Efectivo */}
          <div className="border-[3px] border-black rounded-lg p-4 bg-[#F9F9F9] shadow-[3px_3px_0px_#000] space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-[#FFE500] border-2 border-black flex items-center justify-center font-bold">
                <span className="text-base">🥡</span>
              </div>
              <div>
                <h4 className="font-black text-sm uppercase">Canal 3: El Chino, Verdulería, Panadería (Efectivo / Cash)</h4>
                <span className="text-[11px] font-bold text-slate-600">Por qué ninguna app lo tiene y cómo lo resolvemos</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Como viste en su lista (¡13 compras en chinos y 9 en panaderías!), estos gastos se pagan en cash o QR sin nombre. Ningún banco los categoriza.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white border-2 border-black rounded shadow-[2px_2px_0px_#000]">
                <strong className="block text-black font-black uppercase mb-1">Opción A: Carga en 2 segundos</strong>
                <p className="text-slate-600 font-medium">Abre la app desde el icono en la pantalla de inicio, escribe <code>chino 2500</code> o presiona el micrófono, y Enter.</p>
              </div>
              <div className="p-2.5 bg-white border-2 border-black rounded shadow-[2px_2px_0px_#000]">
                <strong className="block text-black font-black uppercase mb-1">Opción B: Pegar Keep semanal</strong>
                <p className="text-slate-600 font-medium">Si le gusta seguir anotando rápido en Keep, el domingo copia todo el texto y lo pega en el modal con un solo clic.</p>
              </div>
            </div>
          </div>

          {/* Webhook Endpoint Info */}
          <div className="p-3 bg-slate-100 border-2 border-black rounded-lg text-xs space-y-1">
            <span className="font-black uppercase text-black block">Tu Endpoint Webhook Listo:</span>
            <code className="block p-2 bg-white border border-black rounded font-mono font-bold text-[11px] text-slate-800">
              POST /api/webhook
            </code>
            <p className="text-[11px] text-slate-600 font-medium">
              Acepta JSON con <code>{`{ "title": "Big Pons", "amount": 23200, "currency": "ARS", "method": "MERCADO_PAGO" }`}</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t-[3.5px] border-black p-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#FFE500] border-[2.5px] border-black rounded font-black text-xs uppercase shadow-[2px_2px_0px_#000] hover:bg-[#ebd300]"
          >
            ENTENDIDO, VOLVER 🚀
          </button>
        </div>

      </div>
    </div>
  );
}
