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
  const [sortBy, setSortBy] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');
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
        if (filterCategory === 'REFUNDS') {
          return e.amount < 0 || e.isRefund;
        }
        if (filterCategory === 'INSTALLMENTS') {
          return Boolean(e.installments && e.installments.total > 1);
        }
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
    }).sort((a, b) => {
      switch (sortBy) {
        case 'AMOUNT_DESC':
          return b.amount - a.amount;
        case 'AMOUNT_ASC':
          return a.amount - b.amount;
        case 'DATE_ASC':
          return a.date.localeCompare(b.date);
        case 'DATE_DESC':
        default:
          return b.date.localeCompare(a.date);
      }
    });
  }, [expenses, filterCurrency, filterCategory, searchQuery, sortBy]);

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

        {/* Search input & Sort selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por chino, uber, farmacia..."
              className="w-full sm:w-64 h-11 pl-10 pr-4 bg-white border-[2.5px] border-black rounded-lg text-sm font-bold shadow-[2px_2px_0px_#000] focus:outline-none"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Ordenar gastos"
            className="h-11 px-3 bg-white border-[2.5px] border-black rounded-lg text-xs sm:text-sm font-black text-black shadow-[2px_2px_0px_#000] cursor-pointer focus:outline-none"
          >
            <option value="DATE_DESC">📅 Más recientes</option>
            <option value="DATE_ASC">📅 Más antiguos</option>
            <option value="AMOUNT_DESC">💰 Mayor valor</option>
            <option value="AMOUNT_ASC">🪙 Menor valor</option>
          </select>
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
          { label: '💸 Reintegros', val: 'REFUNDS' },
          { label: '💳 En Cuotas', val: 'INSTALLMENTS' },
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
                    {(item.amount < 0 || item.isRefund) && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-500 shrink-0">
                        💸 Reintegro
                      </span>
                    )}
                    {item.discountAmount && item.discountAmount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-500 shrink-0"
                        title={`Ticket original: $${(item.grossAmount || (item.amount + item.discountAmount)).toLocaleString('es-AR')}`}
                      >
                        🎉 Promo -${item.discountAmount.toLocaleString('es-AR')}
                      </span>
                    )}
                    {item.installments && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-900 border border-purple-400 shrink-0">
                        💳 Cuota {item.installments.current}/{item.installments.total}
                      </span>
                    )}
                    {getMethodBadge(item.method, item.currency)}
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 flex-wrap">
                    <span>{item.category}</span>
                    <span>•</span>
                    <span className="font-mono">{item.date}</span>
                    {item.note && (
                      <>
                        <span>•</span>
                        <span className="text-slate-500 font-semibold">{item.note}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Amount, Edit & Delete */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="text-right mr-1">
                  {item.grossAmount && item.discountAmount && item.discountAmount > 0 ? (
                    <span className="text-[11px] font-bold text-slate-400 line-through block leading-none mb-0.5">
                      ${item.grossAmount.toLocaleString('es-AR')}
                    </span>
                  ) : null}
                  <span
                    className={`font-black text-lg sm:text-2xl block leading-tight ${
                      item.amount < 0 || item.isRefund ? 'text-emerald-600' : 'text-black'
                    }`}
                  >
                    {item.currency === 'USD'
                      ? item.amount < 0 || item.isRefund
                        ? `+U$S ${Math.abs(item.amount).toFixed(2)}`
                        : `U$S ${item.amount.toFixed(2)}`
                      : item.amount < 0 || item.isRefund
                      ? `+$${Math.abs(item.amount).toLocaleString('es-AR')}`
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
                const absAmount = Math.abs(editingExpense.amount);
                if (!editingExpense.title.trim() || absAmount <= 0) {
                  alert('Ingresá un concepto y monto válido.');
                  return;
                }
                const isRefund = Boolean(editingExpense.isRefund);
                const finalAmount = isRefund ? -absAmount : absAmount;
                onUpdateExpense({
                  ...editingExpense,
                  amount: finalAmount,
                  isRefund: isRefund ? true : undefined,
                  grossAmount: editingExpense.grossAmount && editingExpense.grossAmount > 0 ? editingExpense.grossAmount : undefined,
                  discountAmount: editingExpense.discountAmount && editingExpense.discountAmount > 0 ? editingExpense.discountAmount : undefined,
                });
                setEditingExpense(null);
              }}
              className="p-5 space-y-4"
            >
              {/* Type Switcher */}
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <span className="text-xs font-black uppercase text-slate-700">Tipo:</span>
                <div className="inline-flex rounded-lg border-[2px] border-black overflow-hidden shadow-[2px_2px_0px_#000]">
                  <button
                    type="button"
                    onClick={() => setEditingExpense({ ...editingExpense, isRefund: false })}
                    className={`px-3 py-1 text-xs font-black transition-colors ${
                      !editingExpense.isRefund ? 'bg-[#FF5376] text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    🔴 Gasto Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingExpense({ ...editingExpense, isRefund: true })}
                    className={`px-3 py-1 text-xs font-black border-l-[2px] border-black transition-colors ${
                      editingExpense.isRefund ? 'bg-[#10B981] text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    💸 Reintegro / Devolución
                  </button>
                </div>
              </div>

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
                    Monto ({editingExpense.isRefund ? 'Reintegro +$' : 'Gasto -$'})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={Math.abs(editingExpense.amount) || ''}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        amount: Math.abs(parseFloat(e.target.value) || 0),
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

              {/* Promo / Ahorro Fields */}
              <div className="bg-emerald-50/70 border border-emerald-400 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                    🎉 Promo / Ahorro aplicado (opcional)
                  </span>
                  {(editingExpense.discountAmount || editingExpense.grossAmount) ? (
                    <button
                      type="button"
                      onClick={() =>
                        setEditingExpense({
                          ...editingExpense,
                          discountAmount: undefined,
                          grossAmount: undefined,
                        })
                      }
                      className="text-[10px] font-bold text-red-600 underline"
                    >
                      Quitar promo
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-0.5">
                      Ticket Original ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingExpense.grossAmount || ''}
                      onChange={(e) =>
                        setEditingExpense({
                          ...editingExpense,
                          grossAmount: e.target.value ? Math.abs(parseFloat(e.target.value)) : undefined,
                        })
                      }
                      placeholder="Ej: 21086"
                      className="w-full h-9 px-2 bg-white border border-black rounded text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-600 mb-0.5">
                      Ahorro / Reintegro ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingExpense.discountAmount || ''}
                      onChange={(e) =>
                        setEditingExpense({
                          ...editingExpense,
                          discountAmount: e.target.value ? Math.abs(parseFloat(e.target.value)) : undefined,
                        })
                      }
                      placeholder="Ej: 10000"
                      className="w-full h-9 px-2 bg-white border border-black rounded text-xs font-bold"
                    />
                  </div>
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
