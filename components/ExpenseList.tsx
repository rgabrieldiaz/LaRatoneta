'use client';

import React, { useState, useMemo } from 'react';
import { Expense, Category, PaymentMethod } from '../lib/types';
import { 
  Store, 
  Utensils, 
  Car, 
  Home, 
  HeartPulse, 
  CreditCard, 
  ShoppingBag, 
  Search, 
  Trash2, 
  Filter,
  DollarSign,
  Bus
} from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
}

export function ExpenseList({ expenses, onDeleteExpense }: ExpenseListProps) {
  const [filterCurrency, setFilterCurrency] = useState<'ALL' | 'ARS' | 'USD'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter logic
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      // Currency filter
      if (filterCurrency !== 'ALL' && e.currency !== filterCurrency) {
        return false;
      }
      // Category filter
      if (filterCategory !== 'ALL') {
        if (filterCategory === 'EFECTIVO' && e.method !== 'EFECTIVO') return false;
        if (filterCategory === 'DIGITAL' && e.method === 'EFECTIVO') return false;
        if (filterCategory !== 'EFECTIVO' && filterCategory !== 'DIGITAL' && e.category !== filterCategory) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchCat = e.category.toLowerCase().includes(q);
        const matchMethod = e.method.toLowerCase().includes(q);
        const matchAmount = e.amount.toString().includes(q);
        if (!matchTitle && !matchCat && !matchMethod && !matchAmount) return false;
      }
      return true;
    });
  }, [expenses, filterCurrency, filterCategory, searchQuery]);

  const getCategoryIcon = (cat: Category, method: PaymentMethod) => {
    if (method === 'SUBE') return <Bus className="w-5 h-5 text-black" />;
    switch (cat) {
      case 'Supermercados':
        return <Store className="w-5 h-5 text-black" />;
      case 'Comida & Salidas':
        return <Utensils className="w-5 h-5 text-black" />;
      case 'Transporte':
        return <Car className="w-5 h-5 text-black" />;
      case 'Hogar & Servicios':
        return <Home className="w-5 h-5 text-black" />;
      case 'Salud & Farmacia':
        return <HeartPulse className="w-5 h-5 text-black" />;
      case 'Tarjetas':
        return <CreditCard className="w-5 h-5 text-black" />;
      default:
        return <ShoppingBag className="w-5 h-5 text-black" />;
    }
  };

  const getMethodBadge = (method: PaymentMethod, currency: string) => {
    if (currency === 'USD') {
      return (
        <span className="px-2 py-0.5 bg-[#00E5FF] text-black border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
          🇺🇸 DÓLAR
        </span>
      );
    }
    switch (method) {
      case 'EFECTIVO':
        return (
          <span className="px-2 py-0.5 bg-[#FFE500] text-black border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            💵 EFECTIVO
          </span>
        );
      case 'MERCADO_PAGO':
        return (
          <span className="px-2 py-0.5 bg-[#00E5FF] text-black border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            📱 MP QR
          </span>
        );
      case 'MODO':
        return (
          <span className="px-2 py-0.5 bg-[#22C55E] text-black border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            ⚡ MODO
          </span>
        );
      case 'DEBITO':
        return (
          <span className="px-2 py-0.5 bg-slate-200 text-black border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            💳 DÉBITO
          </span>
        );
      case 'CREDITO':
        return (
          <span className="px-2 py-0.5 bg-[#FF5376] text-white border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            💳 CRÉDITO
          </span>
        );
      case 'TRANSFERENCIA':
        return (
          <span className="px-2 py-0.5 bg-[#D4B2FF] text-black border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            🏦 TRANSF
          </span>
        );
      case 'SUBE':
        return (
          <span className="px-2 py-0.5 bg-[#54A0FF] text-black border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            🚌 SUBE
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <h3 className="font-black text-base sm:text-lg uppercase tracking-wider flex items-center gap-2">
          <span>LISTADO DE GASTOS ({filtered.length})</span>
        </h3>

        {/* Search input (larger, easier to tap) */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por chino, uber, farmacia..."
            className="w-full sm:w-72 h-11 pl-10 pr-4 bg-white border-[2.5px] border-black rounded-lg text-sm font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Chips Bar (larger buttons and text) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        {/* Currency filters */}
        <button
          onClick={() => setFilterCurrency('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black uppercase border-[2px] border-black shadow-[2px_2px_0px_#000] shrink-0 ${
            filterCurrency === 'ALL' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'
          }`}
        >
          TODOS
        </button>
        <button
          onClick={() => setFilterCurrency('ARS')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black uppercase border-[2px] border-black shadow-[2px_2px_0px_#000] shrink-0 ${
            filterCurrency === 'ARS' ? 'bg-[#FFE500] text-black' : 'bg-white text-black hover:bg-slate-100'
          }`}
        >
          🇦🇷 ARS ($)
        </button>
        <button
          onClick={() => setFilterCurrency('USD')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black uppercase border-[2px] border-black shadow-[2px_2px_0px_#000] shrink-0 ${
            filterCurrency === 'USD' ? 'bg-[#00E5FF] text-black' : 'bg-white text-black hover:bg-slate-100'
          }`}
        >
          🇺🇸 USD (U$S)
        </button>

        {/* Categories filters */}
        <div className="h-6 w-[2px] bg-black/40 mx-1 shrink-0" />

        {[
          { label: '💵 Solo Efectivo', val: 'EFECTIVO' },
          { label: '📱 Solo Digital', val: 'DIGITAL' },
          { label: '🛒 Supermercados', val: 'Supermercados' },
          { label: '🍕 Comida & Salidas', val: 'Comida & Salidas' },
          { label: '🥩 Carnicería & Frescos', val: 'Carnicería, Verdura & Frescos' },
          { label: '🥐 Panadería & Pastas', val: 'Panadería & Pastas' },
          { label: '🚗 Transporte', val: 'Transporte' },
          { label: '🏛️ Hogar & Servicios', val: 'Hogar & Servicios' },
          { label: '🩺 Salud & Farmacia', val: 'Salud & Farmacia' },
        ].map((c) => (
          <button
            key={c.val}
            onClick={() => setFilterCategory(filterCategory === c.val ? 'ALL' : c.val)}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold shrink-0 border-[2px] border-black shadow-[2px_2px_0px_#000] ${
              filterCategory === c.val ? 'bg-[#FF5376] text-white' : 'bg-white text-black hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* List items with larger fonts */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 bg-white border-[3px] border-black rounded-lg text-center shadow-[3px_3px_0px_#000]">
            <p className="font-black text-base uppercase text-slate-700">No se encontraron movimientos con esos filtros.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white border-[3px] border-black rounded-xl p-3.5 sm:p-4 shadow-[3px_3px_0px_#000] flex items-center justify-between gap-3 hover:translate-x-0.5 transition-transform"
            >
              {/* Left: Icon & Info */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-[#F4F4F4] border-[2px] border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000]">
                  {getCategoryIcon(item.category, item.method)}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-base sm:text-lg text-black truncate leading-tight">
                      {item.title}
                    </span>
                    {getMethodBadge(item.method, item.currency)}
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600">
                    <span>{item.category}</span>
                    <span>•</span>
                    <span className="font-mono">{item.date}</span>
                  </div>
                </div>
              </div>

              {/* Right: Amount & Delete */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <div className="text-right">
                  <span className="font-black text-lg sm:text-2xl text-black block leading-tight">
                    {item.currency === 'USD'
                      ? `U$S ${item.amount.toFixed(2)}`
                      : `-$${item.amount.toLocaleString('es-AR')}`}
                  </span>
                  <span className="text-xs font-black text-slate-500 uppercase">{item.currency}</span>
                </div>

                <button
                  onClick={() => onDeleteExpense(item.id)}
                  className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#FF5376] hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-black"
                  title="Eliminar gasto"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
