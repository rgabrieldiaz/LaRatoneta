'use client';

import React, { useState, useEffect, useRef } from 'react';
import { generateInstallmentExpenses } from '../lib/dateUtils';
import { parseLocalizedAmount, parseRawKeepText } from '../lib/keepParser';
import { fetchDolarMepRate, FALLBACK_DOLAR_MEP } from '../lib/dolarApi';
import { Category, Expense, MerchantRulesMap, PaymentMethod } from '../lib/types';
import { Zap, Mic, Plus, ClipboardList, SlidersHorizontal, CheckCheck, Percent, Sparkles } from 'lucide-react';

interface QuickInputProps {
  onAddExpense: (expense: Expense | Expense[]) => void;
  onOpenBatchModal: () => void;
  onOpenReconciliation?: () => void;
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

export function QuickInput({
  onAddExpense,
  onOpenBatchModal,
  onOpenReconciliation,
  merchantRules,
}: QuickInputProps) {
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
  const [manualIsRefund, setManualIsRefund] = useState(false);
  const [manualInstallments, setManualInstallments] = useState(1);

  // Promo / Reintegro calculator states
  const [applyPromo, setApplyPromo] = useState(false);
  const [promoType, setPromoType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [promoPercentVal, setPromoPercentVal] = useState('50');
  const [promoFixedAmount, setPromoFixedAmount] = useState('');
  const [promoCap, setPromoCap] = useState('10000');

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
      if (parsedList.length === 1) {
        onAddExpense(parsedList[0]);
      } else {
        onAddExpense(parsedList);
      }
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

    const calculatedAmount =
      manualCurrency === 'USD' ? Math.round(numericAmount * mepRate) : numericAmount;

    // Promo / Reintegro calculation
    let grossTicket = calculatedAmount;
    let discount = 0;
    let promoNoteDetail = '';

    if (applyPromo && !manualIsRefund && grossTicket > 0) {
      if (promoType === 'PERCENT') {
        const pct = Math.max(0, Math.min(100, parseFloat(promoPercentVal) || 0));
        const rawDiscount = (grossTicket * pct) / 100;
        const cap = parseFloat(promoCap) || 0;
        discount = cap > 0 && rawDiscount > cap ? cap : rawDiscount;
        const hitCap = cap > 0 && rawDiscount >= cap;
        promoNoteDetail = `Promo ${pct}%${hitCap ? ` (Tope $${Math.round(cap).toLocaleString('es-AR')})` : ''} - Ahorro $${Math.round(discount).toLocaleString('es-AR')}`;
      } else {
        const fixedVal = parseFloat(promoFixedAmount) || 0;
        discount = Math.min(grossTicket, fixedVal);
        promoNoteDetail = `Reintegro promo -$${Math.round(discount).toLocaleString('es-AR')}`;
      }
    }

    const netAmountARS = Math.max(0, Math.round(grossTicket - discount));
    const finalAmountARS = manualIsRefund
      ? -Math.abs(calculatedAmount)
      : (discount > 0 ? netAmountARS : calculatedAmount);

    const usdNote =
      manualCurrency === 'USD'
        ? `🇺🇸 U$S ${numericAmount.toFixed(2)} (Dólar MEP $${Math.round(mepRate).toLocaleString('es-AR')})`
        : '';
    const combinedNote = [usdNote, promoNoteDetail, manualNote.trim()].filter(Boolean).join(' • ');

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
      ...(discount > 0 ? { grossAmount: grossTicket, discountAmount: Math.round(discount) } : {}),
      ...(manualIsRefund ? { isRefund: true } : {}),
      ...(combinedNote ? { note: combinedNote } : {}),
    };

    if (manualMethod === 'CREDITO' && manualInstallments > 1 && !manualIsRefund) {
      const generated = generateInstallmentExpenses(
        {
          title: newExpense.title,
          amount: newExpense.amount,
          currency: newExpense.currency,
          category: newExpense.category,
          method: newExpense.method,
          date: newExpense.date,
          isConfirmed: true,
          source: 'MANUAL',
          ...(combinedNote ? { note: combinedNote } : {}),
        },
        manualInstallments
      );
      onAddExpense(generated);
    } else {
      onAddExpense(newExpense);
    }

    setManualTitle('');
    setManualAmount('');
    setManualCurrency('ARS');
    setManualNote('');
    setManualIsRefund(false);
    setManualInstallments(1);
    setApplyPromo(false);
    setPromoPercentVal('50');
    setPromoFixedAmount('');
    setPromoCap('10000');
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

  // Live promo calculations for Manual form
  const rawManualTicket = parseLocalizedAmount(manualAmount, manualCurrency === 'USD');
  const numericManualTicket = isNaN(rawManualTicket)
    ? 0
    : manualCurrency === 'USD'
    ? Math.round(rawManualTicket * mepRate)
    : rawManualTicket;

  let livePromoDiscount = 0;
  let liveHitCap = false;
  if (applyPromo && !manualIsRefund && numericManualTicket > 0) {
    if (promoType === 'PERCENT') {
      const pct = Math.max(0, Math.min(100, parseFloat(promoPercentVal) || 0));
      const rawDiscount = (numericManualTicket * pct) / 100;
      const cap = parseFloat(promoCap) || 0;
      livePromoDiscount = cap > 0 && rawDiscount > cap ? cap : rawDiscount;
      liveHitCap = cap > 0 && rawDiscount >= cap;
    } else {
      const fixedVal = parseFloat(promoFixedAmount) || 0;
      livePromoDiscount = Math.min(numericManualTicket, fixedVal);
    }
  }
  const liveNetManual = Math.max(0, Math.round(numericManualTicket - livePromoDiscount));

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

        <div className="flex items-center gap-3">
          {onOpenReconciliation && (
            <button
              type="button"
              onClick={onOpenReconciliation}
              className="text-xs font-black underline hover:text-[#22C55E] flex items-center gap-1 text-slate-700"
              title="Conciliar consumos contra un resumen de tarjeta o cuenta"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conciliar</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBatchModal}
            className="text-xs font-black underline hover:text-[#FF5376] flex items-center gap-1"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Carga masiva</span>
          </button>
        </div>
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
              { label: '💸 Reintegro', val: 'reintegro modo ' },
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
          {/* Movement Type: Normal Expense vs Refund */}
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 flex-wrap">
            <span className="text-xs font-black uppercase text-slate-700">Tipo:</span>
            <div className="inline-flex rounded-lg border-[2px] border-black overflow-hidden shadow-[2px_2px_0px_#000]">
              <button
                type="button"
                onClick={() => setManualIsRefund(false)}
                className={`px-3 py-1 text-xs font-black transition-colors ${
                  !manualIsRefund ? 'bg-[#FF5376] text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                🔴 Gasto Normal
              </button>
              <button
                type="button"
                onClick={() => setManualIsRefund(true)}
                className={`px-3 py-1 text-xs font-black border-l-[2px] border-black transition-colors ${
                  manualIsRefund ? 'bg-[#10B981] text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                💸 Reintegro / Devolución
              </button>
            </div>
            {manualIsRefund && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                Resta del total y de la categoría
              </span>
            )}
          </div>

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

          {/* Promo / Reintegro Calculator Section */}
          {!manualIsRefund && (
            <div className="bg-emerald-50/80 border-[2px] border-emerald-500 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setApplyPromo(!applyPromo)}
                  className={`px-3 py-1 text-xs font-black rounded-lg border-[2px] border-black transition-colors flex items-center gap-1.5 shadow-[2px_2px_0px_#000] ${
                    applyPromo ? 'bg-[#22C55E] text-black' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{applyPromo ? '🎉 Reintegro / Promo activada' : '+ Aplicar Reintegro / Promo'}</span>
                </button>
                {applyPromo && (
                  <span className="text-[11px] font-bold text-emerald-800">
                    Calcula el monto neto y registra tu ahorro
                  </span>
                )}
              </div>

              {applyPromo && (
                <div className="space-y-2.5 pt-1">
                  {/* Preset chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black uppercase text-slate-700 mr-1">Promo:</span>
                    {[20, 30, 40, 50].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPromoType('PERCENT');
                          setPromoPercentVal(p.toString());
                        }}
                        className={`px-2.5 py-1 text-xs font-black rounded-md border-[1.5px] border-black shadow-[1px_1px_0px_#000] transition-colors ${
                          promoType === 'PERCENT' && promoPercentVal === p.toString()
                            ? 'bg-[#FFE500] text-black'
                            : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        %{p}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPromoType('PERCENT')}
                      className={`px-2 py-1 text-xs font-black rounded-md border-[1.5px] border-black shadow-[1px_1px_0px_#000] ${
                        promoType === 'PERCENT' && ![20, 30, 40, 50].includes(Number(promoPercentVal))
                          ? 'bg-[#FFE500] text-black'
                          : 'bg-white text-slate-700'
                      }`}
                    >
                      % Otro
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoType('FIXED')}
                      className={`px-2.5 py-1 text-xs font-black rounded-md border-[1.5px] border-black shadow-[1px_1px_0px_#000] ${
                        promoType === 'FIXED' ? 'bg-[#FFE500] text-black' : 'bg-white text-slate-700'
                      }`}
                    >
                      $ Monto fijo
                    </button>
                  </div>

                  {/* Inputs row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {promoType === 'PERCENT' ? (
                      <div>
                        <label className="block text-[11px] font-black uppercase text-slate-700 mb-0.5">
                          % Porcentaje de reintegro
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={promoPercentVal}
                            onChange={(e) => setPromoPercentVal(e.target.value)}
                            placeholder="50"
                            className="w-full h-9 px-2.5 pr-7 bg-white border-[2px] border-black rounded-lg text-xs font-black focus:outline-none"
                          />
                          <span className="absolute right-2.5 top-2 text-xs font-black text-slate-400">%</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-black uppercase text-slate-700 mb-0.5">
                          Monto Reintegro ($)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={promoFixedAmount}
                          onChange={(e) => setPromoFixedAmount(e.target.value)}
                          placeholder="Ej: 7000"
                          className="w-full h-9 px-2.5 bg-white border-[2px] border-black rounded-lg text-xs font-black focus:outline-none"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-black uppercase text-slate-700 mb-0.5">
                        Tope Reintegro ($ opcional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={promoCap}
                        onChange={(e) => setPromoCap(e.target.value)}
                        placeholder="Ej: 10000"
                        className="w-full h-9 px-2.5 bg-white border-[2px] border-black rounded-lg text-xs font-black focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Live Calculation preview pill */}
                  {livePromoDiscount > 0 && (
                    <div className="bg-white border-[2px] border-black rounded-lg p-2.5 flex items-center justify-between text-xs font-black shadow-[2px_2px_0px_#000]">
                      <div>
                        <span className="text-emerald-700 block">
                          🎉 Ahorro: -${Math.round(livePromoDiscount).toLocaleString('es-AR')}
                          {liveHitCap && (
                            <span className="ml-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-300">
                              Tope alcanzado
                            </span>
                          )}
                        </span>
                        <span className="text-slate-500 text-[11px] font-medium">
                          Ticket original: ${Math.round(numericManualTicket).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-500 block">Neto a registrar</span>
                        <span className="text-base font-black text-black">
                          ${Math.round(liveNetManual).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
              <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                {manualMethod === 'CREDITO' && !manualIsRefund ? 'Plan de Cuotas' : 'Fecha'}
              </label>
              {manualMethod === 'CREDITO' && !manualIsRefund ? (
                <select
                  value={manualInstallments}
                  onChange={(e) => setManualInstallments(parseInt(e.target.value, 10))}
                  className="w-full h-11 px-2.5 bg-[#FFE500]/20 border-[2px] border-black rounded-lg text-xs sm:text-sm font-black focus:outline-none focus:bg-white"
                >
                  <option value={1}>1 pago (total este mes)</option>
                  <option value={2}>2 cuotas fijas</option>
                  <option value={3}>3 cuotas fijas</option>
                  <option value={6}>6 cuotas fijas</option>
                  <option value={9}>9 cuotas fijas</option>
                  <option value={12}>12 cuotas fijas</option>
                  <option value={18}>18 cuotas fijas</option>
                  <option value={24}>24 cuotas fijas</option>
                </select>
              ) : (
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8F8F8] border-[2px] border-black rounded-lg text-sm font-bold focus:outline-none focus:bg-white"
                  required
                />
              )}
            </div>
          </div>

          {manualMethod === 'CREDITO' && !manualIsRefund && manualInstallments > 1 && (
            <div className="flex items-center justify-between bg-purple-50 border border-purple-300 rounded-lg p-2.5 text-xs font-black text-purple-900">
              <span>
                💳 {manualInstallments} cuotas de ~${Math.round(
                  (manualCurrency === 'USD'
                    ? (parseFloat(manualAmount) || 0) * mepRate
                    : parseFloat(manualAmount) || 0) / manualInstallments
                ).toLocaleString('es-AR')}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-normal text-slate-600">Primer vencimiento:</span>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="px-2 py-0.5 bg-white border border-black rounded text-xs font-mono font-bold"
                />
              </div>
            </div>
          )}

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
              className={`h-11 px-6 border-[2.5px] border-black rounded-lg shadow-[3px_3px_0px_#000] font-black uppercase text-sm flex items-center justify-center gap-1.5 transition-colors ${
                manualIsRefund
                  ? 'bg-[#10B981] text-white hover:bg-[#059669]'
                  : 'bg-[#22C55E] text-black hover:bg-[#1eb353]'
              }`}
            >
              {manualIsRefund ? <Zap className="w-4 h-4 fill-white text-white" /> : <Plus className="w-4 h-4" />}
              <span>{manualIsRefund ? 'Guardar Reintegro' : 'Guardar gasto'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
