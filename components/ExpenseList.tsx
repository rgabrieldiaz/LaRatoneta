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
  Pencil,
  Check,
  X,
  Bus
} from 'lucide-react';

const ALL_CATEGORIES: Category[] = [
  'Supermercados',
  'Frescos & Panadería',
  'Comida & Salidas',
  'Hogar & Servicios',
  'Transporte',
  'Salud & Farmacia',
  'Cuidado & Varios',
  'Resúmenes Tarjeta',
];

const ALL_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'EFECTIVO', label: '💵 Efectivo' },
  { value: 'CUENTA', label: '⚡ En Cuenta (Débito/Billeteras/Ripio)' },
  { value: 'CREDITO', label: '💳 Tarjeta de Crédito' },
  { value: 'SUBE', label: '🚌 SUBE' },
];

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  onUpdateExpense?: (expense: Expense) => void;
}

export function ExpenseList({ expenses, onDeleteExpense, onUpdateExpense }: ExpenseListProps) {
  const [filterCurrency, setFilterCurrency] = useState<'ALL' | 'ARS' | 'USD'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const hasUSD = useMemo(() => expenses.some(e => e.currency === 'USD'), [expenses]);

  // Filter logic
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      // Currency filter
      if (filterCurrency !== 'ALL' && e.currency !== filterCurrency) {
        return false;
      }
      // Category / Method filter
      if (filterCategory !== 'ALL') {
        if (filterCategory === 'EFECTIVO' && e.method !== 'EFECTIVO') return false;
        if (filterCategory === 'CUENTA' && e.method !== 'CUENTA') return false;
        if (filterCategory === 'CREDITO' && e.method !== 'CREDITO') return false;
        if (
          filterCategory !== 'EFECTIVO' &&
          filterCategory !== 'CUENTA' &&
          filterCategory !== 'CREDITO' &&
          e.category !== filterCategory
        ) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchCat = e.category.toLowerCase().includes(q);
        const matchMethod = e.method.toLowerCase().includes(q);
        const matchNote = e.note ? e.note.toLowerCase().includes(q) : false;
        const matchAmount = e.amount.toString().includes(q);
        if (!matchTitle && !matchCat && !matchMethod && !matchNote && !matchAmount) return false;
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
      case 'Resúmenes Tarjeta':
        return <CreditCard className="w-5 h-5 text-black" />;
      default:
        return <ShoppingBag className="w-5 h-5 text-black" />;
    }
  };

  const getMethodBadge = (method: PaymentMethod | string, currency: string) => {
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
      case 'CUENTA':
      case 'MERCADO_PAGO':
      case 'MODO':
      case 'DEBITO':
      case 'TRANSFERENCIA':
        return (
          <span className="px-2 py-0.5 bg-[#22C55E] text-black border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            ⚡ EN CUENTA
          </span>
        );
      case 'CREDITO':
        return (
          <span className="px-2 py-0.5 bg-[#FF5376] text-white border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            💳 CRÉDITO
          </span>
        );
      case 'SUBE':
        return (
          <span className="px-2 py-0.5 bg-[#54A0FF] text-white border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            🚌 SUBE
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-slate-200 text-black border-[1.5px] border-black text-xs font-black rounded uppercase shadow-[1px_1px_0px_#000]">
            {method}
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
        {hasUSD && (
          <>
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
          </>
        )}

        {/* Categories filters */}
        <div className="h-6 w-[2px] bg-black/40 mx-1 shrink-0" />

        {[
          { label: '💵 Efectivo', val: 'EFECTIVO' },
          { label: '⚡ En Cuenta', val: 'CUENTA' },
          { label: '💳 Crédito', val: 'CREDITO' },
          { label: '🛒 Supermercados', val: 'Supermercados' },
          { label: '🥩 Frescos & Panadería', val: 'Frescos & Panadería' },
          { label: '🍕 Comida & Salidas', val: 'Comida & Salidas' },
          { label: '🏠 Hogar & Servicios', val: 'Hogar & Servicios' },
          { label: '🚗 Transporte', val: 'Transporte' },
          { label: '🩺 Salud & Farmacia', val: 'Salud & Farmacia' },
          { label: '🛍️ Cuidado & Varios', val: 'Cuidado & Varios' },
          { label: '💳 Resúmenes Tarjeta', val: 'Resúmenes Tarjeta' },
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

              {/* Right: Amount, Edit & Delete */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="text-right mr-1">
                  <span className="font-black text-lg sm:text-2xl text-black block leading-tight">
                    {item.currency === 'USD'
                      ? `U$S ${item.amount.toFixed(2)}`
                      : `-$${item.amount.toLocaleString('es-AR')}`}
                  </span>
                  <span className="text-xs font-black text-slate-500 uppercase">{item.currency}</span>
                </div>

                {confirmDeleteId === item.id ? (
                  <div className="flex items-center gap-1.5 bg-[#FF5376]/10 border-[2px] border-[#FF5376] rounded-lg px-2 py-1">
                    <span className="text-xs font-black text-[#FF5376] hidden sm:inline">¿Borrar?</span>
                    <button
                      onClick={() => {
                        onDeleteExpense(item.id);
                        setConfirmDeleteId(null);
                      }}
                      className="px-2 py-1 bg-[#FF5376] text-white text-xs font-black rounded border border-black hover:bg-[#e03a5e]"
                      title="Confirmar eliminación"
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 bg-white text-black text-xs font-black rounded border border-black hover:bg-slate-100"
                      title="Cancelar"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {onUpdateExpense && (
                      <button
                        onClick={() => setEditingExpense({ ...item })}
                        className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-black hover:bg-[#FFE500] rounded-lg transition-colors border border-transparent hover:border-black"
                        title="Editar gasto"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-[#FF5376] hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-black"
                      title="Eliminar gasto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && onUpdateExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] rounded-2xl overflow-hidden">
            <div className="bg-[#FFE500] border-b-[3px] border-black px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-black text-base sm:text-lg uppercase text-black">
                Editar Gasto
              </h3>
              <button
                onClick={() => setEditingExpense(null)}
                className="w-8 h-8 flex items-center justify-center bg-white border-[2px] border-black rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingExpense.title.trim() || editingExpense.amount <= 0) {
                  alert('Ingresá un concepto y monto válido.');
                  return;
                }
                onUpdateExpense(editingExpense);
                setEditingExpense(null);
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Concepto
                </label>
                <input
                  type="text"
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                  className="w-full h-11 px-3 bg-[#F8F8F8] border-[2.5px] border-black rounded-lg text-sm font-bold focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Monto ($ ARS)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={editingExpense.amount}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full h-11 px-3 bg-[#F8F8F8] border-[2.5px] border-black rounded-lg text-base font-black focus:outline-none focus:bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                    className="w-full h-11 px-3 bg-[#F8F8F8] border-[2.5px] border-black rounded-lg text-sm font-bold focus:outline-none focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={editingExpense.category}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        category: e.target.value as Category,
                      })
                    }
                    className="w-full h-11 px-2.5 bg-[#F8F8F8] border-[2.5px] border-black rounded-lg text-xs font-bold focus:outline-none focus:bg-white"
                  >
                    {ALL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Método
                  </label>
                  <select
                    value={editingExpense.method}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        method: e.target.value as PaymentMethod,
                      })
                    }
                    className="w-full h-11 px-2.5 bg-[#F8F8F8] border-[2.5px] border-black rounded-lg text-xs font-bold focus:outline-none focus:bg-white"
                  >
                    {ALL_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                  Detalle / Billetera (opcional)
                </label>
                <input
                  type="text"
                  value={editingExpense.note || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, note: e.target.value })}
                  placeholder="Ej: Ripio NFC, Personal Pay, Apple Pay..."
                  className="w-full h-10 px-3 bg-[#F8F8F8] border-[2px] border-black rounded-lg text-xs font-bold focus:outline-none focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-3 bg-white border-[2.5px] border-black rounded-xl text-sm font-black uppercase hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#22C55E] border-[2.5px] border-black rounded-xl text-sm font-black uppercase shadow-[3px_3px_0px_#000] hover:bg-[#1eb353] flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
