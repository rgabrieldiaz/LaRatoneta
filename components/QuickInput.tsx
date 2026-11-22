'use client';

import React, { useState } from 'react';
import { parseRawKeepText } from '../lib/keepParser';
import { Expense } from '../lib/types';
import { Zap, Mic, Camera, Plus, ClipboardList, Sparkles } from 'lucide-react';

interface QuickInputProps {
  onAddExpense: (expense: Expense) => void;
  onOpenBatchModal: () => void;
}

export function QuickInput({ onAddExpense, onOpenBatchModal }: QuickInputProps) {
  const [inputVal, setInputVal] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const parsedList = parseRawKeepText(inputVal);
    if (parsedList.length > 0) {
      onAddExpense(parsedList[0]);
      setInputVal('');
    } else {
      // Fallback if no number is found, assume 0 or prompt
      alert('Por favor ingresá concepto y monto (ejemplo: "chino 3500" o "uber 4500")');
    }
  };

  const handleQuickPreset = (presetName: string) => {
    setInputVal(`${presetName} `);
  };

  const handleVoiceToggle = () => {
    // Check SpeechRecognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta dictado por voz nativo. Podes tipear directamente "chino 2500" o usar el modal de Keep!');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputVal(transcript);
    };

    recognition.start();
  };

  return (
    <div className="w-full brutal-card-purple p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border-[2.5px] border-black rounded shadow-[2px_2px_0px_#000]">
          <Zap className="w-4 h-4 text-black fill-[#FFE500]" />
          <span className="text-xs font-black uppercase tracking-wider">CARGA ULTRA-RÁPIDA (KEEP STYLE)</span>
        </div>

        <button
          onClick={onOpenBatchModal}
          className="text-xs font-black underline hover:text-[#FF5376] flex items-center gap-1"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Pegar lote de Keep</span>
        </button>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ej: chino 19510, taxi 4500, cafe 3200..."
            className="w-full h-12 px-4 bg-white border-[3px] border-black rounded-lg text-sm font-bold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-0 shadow-[2px_2px_0px_#000]"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {/* Voice button */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            className={`w-12 h-12 flex items-center justify-center border-[3px] border-black rounded-lg shadow-[2px_2px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${
              isListening ? 'bg-[#FF5376] text-white animate-pulse' : 'bg-[#22C55E] text-black'
            }`}
            title="Dictar por voz"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Add Button */}
          <button
            type="submit"
            className="flex-1 sm:flex-none h-12 px-5 bg-[#FF5376] text-white border-[3px] border-black rounded-lg shadow-[3px_3px_0px_#000] font-black uppercase text-sm flex items-center justify-center gap-1.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all hover:bg-[#ff3863]"
          >
            <Plus className="w-5 h-5" />
            <span>+ AGREGAR 💥</span>
          </button>
        </div>
      </form>

      {/* Quick Presets for her daily frequent shops */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
        <span className="text-[10px] font-black uppercase text-slate-700 shrink-0">ATAJOS:</span>
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
            className="px-2 py-0.5 bg-white border-[1.5px] border-black rounded text-[11px] font-bold shrink-0 shadow-[1px_1px_0px_#000] hover:bg-[#FFE500] active:translate-x-0.5 active:translate-y-0.5"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
