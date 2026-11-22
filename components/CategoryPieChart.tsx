'use client';

import React, { useState, useMemo } from 'react';
import { Expense, Category } from '../lib/types';
import { 
  PieChart as PieIcon, 
  Store, 
  Utensils, 
  Car, 
  Home, 
  HeartPulse, 
  CreditCard, 
  ShoppingBag, 
  Layers, 
  DollarSign 
} from 'lucide-react';

interface CategoryPieChartProps {
  expenses: Expense[];
  selectedMonthLabel: string;
}

interface CategorySlice {
  category: Category;
  amount: number;
  count: number;
  percentage: number;
  color: string;
  startAngle: number;
  endAngle: number;
  pathData: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Supermercados': '#FF6B6B', // Coral
  'Frescos & Panadería': '#2ECC71', // Green
  'Comida & Salidas': '#FF9F43', // Orange
  'Hogar & Servicios': '#A29BFE', // Purple
  'Transporte': '#54A0FF', // Blue
  'Salud & Farmacia': '#00D2D3', // Teal
  'Cuidado & Varios': '#FD79A8', // Pink
  'Resúmenes Tarjeta': '#FF7675', // Rose/Red
};

export function CategoryPieChart({ expenses, selectedMonthLabel }: CategoryPieChartProps) {
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // 1. Group and calculate totals per category for active currency
  const { slices, totalAmount, totalCount } = useMemo(() => {
    const filtered = expenses.filter(e => e.currency === currency);
    const totals: Record<string, { amount: number; count: number }> = {};

    let total = 0;
    for (const exp of filtered) {
      total += exp.amount;
      if (!totals[exp.category]) {
        totals[exp.category] = { amount: 0, count: 0 };
      }
      totals[exp.category].amount += exp.amount;
      totals[exp.category].count += 1;
    }

    const sortedEntries = Object.entries(totals)
      .map(([cat, data]) => ({
        category: cat as Category,
        amount: data.amount,
        count: data.count,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
        color: CATEGORY_COLORS[cat] || '#CBD5E1',
      }))
      .sort((a, b) => b.amount - a.amount);

    // Compute SVG Donut arc paths
    const cx = 110;
    const cy = 110;
    const outerR = 95;
    const innerR = 56;
    let currentAngle = -Math.PI / 2; // Start from top (-90 degrees)

    const computedSlices: CategorySlice[] = sortedEntries.map((item) => {
      const sliceAngle = (item.amount / (total || 1)) * (2 * Math.PI);
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      // Handle single-item edge case (full circle)
      const isFullCircle = sliceAngle >= 2 * Math.PI - 0.001;

      let pathData = '';
      if (isFullCircle) {
        // Draw complete donut with two semicircles
        const midAngle = startAngle + Math.PI;
        const x1 = cx + outerR * Math.cos(startAngle);
        const y1 = cy + outerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(midAngle);
        const y2 = cy + outerR * Math.sin(midAngle);
        const ix1 = cx + innerR * Math.cos(startAngle);
        const iy1 = cy + innerR * Math.sin(startAngle);
        const ix2 = cx + innerR * Math.cos(midAngle);
        const iy2 = cy + innerR * Math.sin(midAngle);

        pathData = `
          M ${x1} ${y1}
          A ${outerR} ${outerR} 0 0 1 ${x2} ${y2}
          A ${outerR} ${outerR} 0 0 1 ${x1} ${y1}
          M ${ix1} ${iy1}
          A ${innerR} ${innerR} 0 0 0 ${ix2} ${iy2}
          A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1}
          Z
        `;
      } else {
        const x1 = cx + outerR * Math.cos(startAngle);
        const y1 = cy + outerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(endAngle);
        const y2 = cy + outerR * Math.sin(endAngle);
        const x3 = cx + innerR * Math.cos(endAngle);
        const y3 = cy + innerR * Math.sin(endAngle);
        const x4 = cx + innerR * Math.cos(startAngle);
        const y4 = cy + innerR * Math.sin(startAngle);

        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

        pathData = [
          `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
          `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
          `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
          `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
          'Z',
        ].join(' ');
      }

      return {
        ...item,
        startAngle,
        endAngle,
        pathData,
      };
    });

    return {
      slices: computedSlices,
      totalAmount: total,
      totalCount: filtered.length,
    };
  }, [expenses, currency]);

  // Formatter helpers
  const formatCurrency = (val: number) => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(val);
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const activeHoveredSlice = slices.find(s => s.category === hoveredCategory);

  const getCategoryIcon = (cat: Category) => {
    switch (cat) {
      case 'Supermercados': return <Store className="w-3.5 h-3.5" />;
      case 'Comida & Salidas': return <Utensils className="w-3.5 h-3.5" />;
      case 'Transporte': return <Car className="w-3.5 h-3.5" />;
      case 'Hogar & Servicios': return <Home className="w-3.5 h-3.5" />;
      case 'Salud & Farmacia': return <HeartPulse className="w-3.5 h-3.5" />;
      case 'Resúmenes Tarjeta': return <CreditCard className="w-3.5 h-3.5" />;
      default: return <ShoppingBag className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="w-full brutal-card p-5 space-y-5 bg-white border-[3.5px] border-black shadow-[4px_4px_0px_#000]">
      
      {/* Header with Title and Currency Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b-[2px] border-black">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#FFE500] border-[2px] border-black rounded shadow-[2px_2px_0px_#000]">
            <PieIcon className="w-5 h-5 text-black" />
          </div>
          <div>
            <h2 className="font-black text-base sm:text-lg uppercase tracking-tight text-black flex items-center gap-2 flex-wrap">
              <span>GRÁFICO DE TORTA POR CATEGORÍA</span>
              <span className="text-xs bg-black text-white px-2.5 py-0.5 rounded uppercase font-black">
                {selectedMonthLabel}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-bold">
              Distribución porcentual de los consumos del período
            </p>
          </div>
        </div>

      </div>

      {/* Main Content Area */}
      {slices.length === 0 ? (
        <div className="py-10 text-center space-y-2">
          <div className="w-12 h-12 mx-auto bg-slate-100 rounded-full border border-black flex items-center justify-center text-xl">
            🧀
          </div>
          <p className="text-xs font-bold text-slate-600">
            No hay gastos registrados en {currency === 'ARS' ? 'Pesos' : 'Dólares'} para este mes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Donut Chart (SVG) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center relative">
            <div className="relative w-[230px] h-[230px]">
              <svg 
                viewBox="0 0 220 220" 
                className="w-full h-full transform transition-transform filter drop-shadow-[3px_3px_0px_#000]"
              >
                {slices.map((slice) => {
                  const isHovered = hoveredCategory === slice.category;
                  return (
                    <path
                      key={slice.category}
                      d={slice.pathData}
                      fill={slice.color}
                      stroke="#000000"
                      strokeWidth={isHovered ? '3.5' : '2'}
                      className="cursor-pointer transition-all duration-200 hover:opacity-95"
                      style={{
                        transformOrigin: '110px 110px',
                        transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                      }}
                      onMouseEnter={() => setHoveredCategory(slice.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  );
                })}
              </svg>

              {/* Center Info in the Donut Hole */}
              <div 
                className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3"
              >
                {activeHoveredSlice ? (
                  <>
                    <span 
                      className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-black mb-0.5 max-w-[100px] truncate"
                      style={{ backgroundColor: activeHoveredSlice.color }}
                    >
                      {activeHoveredSlice.category}
                    </span>
                    <span className="text-sm font-black text-black leading-tight">
                      {formatCurrency(activeHoveredSlice.amount)}
                    </span>
                    <span className="text-xs font-black text-[#22C55E]">
                      {activeHoveredSlice.percentage.toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">
                      {activeHoveredSlice.count} compras
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                      TOTAL {currency}
                    </span>
                    <span className="text-sm sm:text-base font-black text-black leading-none my-1">
                      {formatCurrency(totalAmount)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                      {totalCount} gastos
                    </span>
                  </>
                )}
              </div>
            </div>

            <p className="text-[10px] font-bold text-slate-500 mt-2 text-center">
              💡 Pasá el cursor o tocá una porción para ver el detalle
            </p>
          </div>

          {/* Category Breakdown & Legend */}
          <div className="md:col-span-7 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto p-1.5">
              {slices.map((slice) => {
                const isHovered = hoveredCategory === slice.category;
                return (
                  <div
                    key={slice.category}
                    onMouseEnter={() => setHoveredCategory(slice.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`p-2.5 rounded-lg border-[2px] transition-all cursor-pointer ${
                      isHovered
                        ? 'border-black bg-[#FFF9D2] shadow-[4px_4px_0px_#000] -translate-y-0.5'
                        : 'border-black/30 bg-slate-50 hover:border-black hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className="w-4 h-4 rounded border border-black shrink-0 flex items-center justify-center text-black"
                          style={{ backgroundColor: slice.color }}
                        >
                          {getCategoryIcon(slice.category)}
                        </span>
                        <span className="text-sm font-black text-black truncate">
                          {slice.category}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-black bg-white px-2 py-0.5 rounded border border-black shrink-0 shadow-[1px_1px_0px_#000]">
                        {slice.percentage.toFixed(1)}%
                      </span>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-black/40 mb-2">
                      <div 
                        className="h-full rounded-full"
                        style={{ 
                          width: `${slice.percentage}%`,
                          backgroundColor: slice.color 
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-black text-black text-sm sm:text-base">
                        {formatCurrency(slice.amount)}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {slice.count} compras
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
