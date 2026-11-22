'use client';

import React, { useState, useEffect, useRef } from 'react';
import { parseLocalizedAmount, parseRawKeepText } from '../lib/keepParser';
import { fetchDolarMepRate, FALLBACK_DOLAR_MEP } from '../lib/dolarApi';
import { Category, Expense, MerchantRulesMap, PaymentMethod } from '../lib/types';
import { Zap, Mic, Plus, ClipboardList, SlidersHorizontal } from 'lucide-react';

interface QuickInputProps {
  onAddExpense: (expense: Expense) => void;
  onOpenBatchModal: () => void;
  merchantRules?: MerchantRulesMap;
}

const MANUAL_CATEGORIES: Category[] = [
  'Supermercados',
  'Frescos & Panadería',
  'Comida & Salidas',
  'Hogar & Servicios',
  'Transporte',
  'Salud & Farmacia',
  'Cuidado & Varios',
];

const MANUAL_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'EFECTIVO', label: '💵 Efectivo' },
  { value: 'CUENTA', label: '⚡ En Cuenta (Débito/Billeteras/Ripio)' },
  { value: 'CREDITO', label: '💳 Tarjeta de Crédito' },
  { value: 'SUBE', label: '🚌 SUBE' },
];

export function QuickInput({ onAddExpense, onOpenBatchModal, merchantRules }: QuickInputProps) {
  const [mode, setMode] = useState<'QUICK' | 'MANUAL'>('QUICK');
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [mepRate, setMepRate] = useState<number>(FALLBACK_DOLAR_MEP);
  const recognitionRef = useRef<any>(null);
  const voiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickInputRef = useRef<HTMLInputElement | null>(null);

  // Manual mode states
  const [manualTitle, setManualTitle] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCurrency, setManualCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [manualCategory, setManualCategory] = useState<Category>('Supermercados');
  const [manualMethod, setManualMethod] = useState<PaymentMethod>('CUENTA');
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualNote, setManualNote] = useState('');

  useEffect(() => {
    fetchDolarMepRate().then((rate) => setMepRate(rate));
    return () => {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!voiceHint) return;
    const t = setTimeout(() => setVoiceHint(null), 6000);
    return () => clearTimeout(t);
  }, [voiceHint]);

  const handleQuickSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const parsedList = parseRawKeepText(inputVal, mepRate, merchantRules);
    if (parsedList.length > 0) {
      onAddExpense(parsedList[0]);
      setInputVal('');
    } else {
      alert('Ingresá concepto y monto (ej: "chino 4500 efectivo" o "icloud 0,99 dolares")');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseLocalizedAmount(manualAmount, manualCurrency === 'USD');
    if (!manualTitle.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      alert('Completá el concepto y un monto válido.');
      return;
    }

    const finalAmountARS =
      manualCurrency === 'USD' ? Math.round(numericAmount * mepRate) : numericAmount;
    const usdNote =
      manualCurrency === 'USD'
        ? `🇺🇸 U$S ${numericAmount.toFixed(2)} (Dólar MEP $${Math.round(mepRate).toLocaleString('es-AR')})`
        : '';
    const combinedNote = [usdNote, manualNote.trim()].filter(Boolean).join(' • ');

    const newExpense: Expense = {
      id: `manual-${Date.now()}`,
      title: manualTitle.trim().charAt(0).toUpperCase() + manualTitle.trim().slice(1),
      amount: finalAmountARS,
      currency: 'ARS',
      category: manualCategory,
      method: manualMethod,
      date: manualDate,
      isConfirmed: true,
      source: 'MANUAL',
      ...(combinedNote ? { note: combinedNote } : {}),
    };

    onAddExpense(newExpense);
    setManualTitle('');
    setManualAmount('');
    setManualCurrency('ARS');
    setManualNote('');
  };

  const handleQuickPreset = (presetName: string) => {
    setMode('QUICK');
    setInputVal(`${presetName} `);
  };

  const stopVoiceRecognition = () => {
    if (voiceTimeoutRef.current) {
      clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore abort errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopVoiceRecognition();
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && isStandalone) {
      quickInputRef.current?.focus();
      setVoiceHint('En iPhone (app), tocá el micrófono 🎙️ abajo a la derecha del teclado para dictar.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      quickInputRef.current?.focus();
      setVoiceHint('Usá el micrófono 🎙️ del teclado de tu celular para dictar (ej: "chino 2500 efectivo").');
      return;
    }

    setVoiceHint(null);
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    const clearSafetyTimer = () => {
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
        voiceTimeoutRef.current = null;
      }
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      clearSafetyTimer();
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = (event: any) => {
      clearSafetyTimer();
      recognitionRef.current = null;
      setIsListening(false);
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        quickInputRef.current?.focus();
        setVoiceHint('El navegador bloqueó el micrófono. Usá el micrófono 🎙️ del teclado para dictar.');
      } else if (event?.error !== 'aborted' && event?.error !== 'no-speech') {
        setVoiceHint('No se pudo escuchar. Probá de nuevo o usá el micrófono 🎙️ del teclado.');
      }
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) {
        setInputVal(transcript);
      }
    };

    try {
      setIsListening(true);
      recognition.start();
      // Safety timeout so the mic button never gets stuck pulsing on iOS Safari
      voiceTimeoutRef.current = setTimeout(() => {
        stopVoiceRecognition();
        quickInputRef.current?.focus();
        setVoiceHint('No detectó voz. En iPhone podés usar el micrófono 🎙️ del teclado.');
      }, 10000);
    } catch {
      stopVoiceRecognition();
      quickInputRef.current?.focus();
      setVoiceHint('No se pudo activar el micrófono. Usá el micrófono 🎙️ del teclado.');
    }
  };

  return (
    <div className="w-full brutal-card-purple p-4 sm:p-5 space-y-3.5">
      {/* Header with Mode Switch & Bulk Import */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border-[2.5px] border-black rounded shadow-[2px_2px_0px_#000]">
            <Zap className="w-4 h-4 text-black fill-[#FFE500]" />
            <span className="text-xs font-black uppercase tracking-wider">AGREGAR GASTO</span>
          </div>

          {/* Mode Tabs */}
          <div className="inline-flex bg-white border-[2px] border-black rounded-lg overflow-hidden shadow-[2px_2px_0px_#000]">
            <button
              type="button"
              onClick={() => setMode('QUICK')}
              className={`px-2.5 py-1 text-xs font-black flex items-center gap-1 transition-colors ${
                mode === 'QUICK' ? 'bg-[#FFE500] text-black' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Rápido</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('MANUAL')}
              className={`px-2.5 py-1 text-xs font-black flex items-center gap-1 border-l-[2px] border-black transition-colors ${
                mode === 'MANUAL' ? 'bg-[#FFE500] text-black' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Manual</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenBatchModal}
          className="text-xs font-black underline hover:text-[#FF5376] flex items-center gap-1"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Carga masiva</span>
        </button>
      </div>

      {mode === 'QUICK' ? (
        <>
          {/* Quick Text Input Form */}
          <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <input
                ref={quickInputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ej: chino 4500 efectivo, big pons 23200 credito..."
                className="w-full h-14 px-4 bg-white border-[3px] border-black rounded-xl text-base sm:text-lg font-black placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-0 shadow-[3px_3px_0px_#000]"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleVoiceToggle}
                className={`w-14 h-14 flex items-center justify-center border-[3px] border-black rounded-xl shadow-[3px_3px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${
                  isListening ? 'bg-[#FF5376] text-white animate-pulse' : 'bg-[#22C55E] text-black'
                }`}
                title="Dictar por voz"
              >
                <Mic className="w-6 h-6" />
              </button>

              <button
                type="submit"
                className="flex-1 sm:flex-none h-14 px-6 bg-[#FF5376] text-white border-[3px] border-black rounded-xl shadow-[3px_3px_0px_#000] font-black uppercase text-sm sm:text-base flex items-center justify-center gap-2 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all hover:bg-[#ff3863]"
              >
                <Plus className="w-5 h-5" />
                <span>Agregar</span>
              </button>
            </div>
          </form>

          {voiceHint && (
            <div className="px-3 py-2 bg-[#FFE500] border-[2px] border-black rounded-lg text-xs font-black text-black shadow-[2px_2px_0px_#000]">
              {voiceHint}
            </div>
          )}

          {/* Quick Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5">
            <span className="text-xs font-black uppercase text-slate-700 shrink-0">ATAJOS:</span>
            {[
              { label: '🥡 Chino', val: 'Chino' },
              { label: '🥬 Verdulería', val: 'Verdulería' },
              { label: '🥖 Panadería', val: 'Panadería' },
              { label: '🥩 Carnicería', val: 'Carnicería' },
              { label: '🚗 Cabify', val: 'Cabify' },
              { label: '🍕 Comida', val: 'Comida' },
              { label: '🚌 Sube', val: 'Sube' },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleQuickPreset(p.val)}
                className="px-3 py-1.5 bg-white border-[2px] border-black rounded-lg text-xs sm:text-sm font-black shrink-0 shadow-[1.5px_1.5px_0px_#000] hover:bg-[#FFE500] active:translate-x-0.5 active:translate-y-0.5"
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* Classic Manual Form */
        <form onSubmit={handleManualSubmit} className="bg-white border-[3px] border-black rounded-xl p-4 space-y-3 shadow-[3px_3px_0px_#000]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">Concepto</label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Ej: Supermercado Coto, Farmacia..."
                className="w-full h-11 px-3 bg-[#F8F8F8] border-[2px] border-black rounded-lg text-sm font-bold focus:outline-none focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                Monto ({manualCurrency === 'USD' ? 'U$S' : '$ ARS'})
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step={manualCurrency === 'USD' ? '0.01' : '1'}
                  min="0.01"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder={manualCurrency === 'USD' ? '0.99' : '15000'}
                  className="w-full h-11 px-3 bg-[#F8F8F8] border-[2px] border-black rounded-lg text-base font-black focus:outline-none focus:bg-white"
                  required
                />
                <select
                  value={manualCurrency}
                  onChange={(e) => setManualCurrency(e.target.value as 'ARS' | 'USD')}
                  aria-label="Moneda"
                  className="h-11 px-2 bg-[#FFE500] border-[2px] border-black rounded-lg text-xs font-black cursor-pointer focus:outline-none shrink-0"
                >
                  <option value="ARS">$ ARS</option>
                  <option value="USD">U$S</option>
                </select>
              </div>
              {manualCurrency === 'USD' && parseFloat(manualAmount) > 0 && (
                <p className="text-[11px] font-bold text-slate-700 mt-1">
                  ≈ ${Math.round(parseFloat(manualAmount) * mepRate).toLocaleString('es-AR')} ARS (MEP ${Math.round(mepRate).toLocaleString('es-AR')})
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">Categoría</label>
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value as Category)}
                className="w-full h-11 px-2.5 bg-[#F8F8F8] border-[2px] border-black rounded-lg text-xs sm:text-sm font-bold focus:outline-none focus:bg-white"
              >
                {MANUAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">Método de pago</label>
              <select
                value={manualMethod}
                onChange={(e) => setManualMethod(e.target.value as PaymentMethod)}
                className="w-full h-11 px-2.5 bg-[#F8F8F8] border-[2px] border-black rounded-lg text-xs sm:text-sm font-bold focus:outline-none focus:bg-white"
              >
                {MANUAL_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full h-11 px-3 bg-[#F8F8F8] border-[2px] border-black rounded-lg text-sm font-bold focus:outline-none focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-1">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">Detalle / Billetera (opcional)</label>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Ej: Ripio NFC, Personal Pay, Apple Pay..."
                className="w-full h-11 px-3 bg-[#F8F8F8] border-[2px] border-black rounded-lg text-xs sm:text-sm font-bold focus:outline-none focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="h-11 px-6 bg-[#22C55E] text-black border-[2.5px] border-black rounded-lg shadow-[3px_3px_0px_#000] font-black uppercase text-sm flex items-center justify-center gap-1.5 hover:bg-[#1eb353]"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar gasto</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
