'use client';

import React, { useState, useMemo } from 'react';
import { Expense, FixedService, Category, PaymentMethod } from '../lib/types';
import { 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Settings2, 
  Plus, 
  Zap, 
  Flame, 
  Droplets, 
  Wifi, 
  Smartphone, 
  Home, 
  FileText,
  X,
  Check
} from 'lucide-react';

interface FixedServicesChecklistProps {
  expenses: Expense[];
  monthLabel: string;
  fixedServices: FixedService[];
  onSaveServices?: (services: FixedService[]) => void;
  onSelectServiceToPay?: (service: FixedService) => void;
}

export function FixedServicesChecklist({
  expenses,
  monthLabel,
  fixedServices,
  onSaveServices,
  onSelectServiceToPay,
}: FixedServicesChecklistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editingServices, setEditingServices] = useState<FixedService[]>(fixedServices);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceKeywords, setNewServiceKeywords] = useState('');

  // Sync state when prop updates
  React.useEffect(() => {
    setEditingServices(fixedServices);
  }, [fixedServices]);

  // Match each active service with expenses of the current month
  const serviceStatuses = useMemo(() => {
    const activeList = fixedServices.filter((s) => s.active);
    return activeList.map((service) => {
      const match = expenses.find((e) => {
        const text = `${e.title} ${e.note || ''}`.toLowerCase();
        return service.keywords.some((k) => text.includes(k.toLowerCase()));
      });

      return {
        service,
        isPaid: Boolean(match),
        paidExpense: match,
      };
    });
  }, [fixedServices, expenses]);

  const paidCount = serviceStatuses.filter((s) => s.isPaid).length;
  const totalCount = serviceStatuses.length;
  const allPaid = totalCount > 0 && paidCount === totalCount;

  const getServiceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('luz') || n.includes('edesur') || n.includes('edenor')) {
      return <Zap className="w-4 h-4 text-amber-500" />;
    }
    if (n.includes('gas') || n.includes('metrogas')) {
      return <Flame className="w-4 h-4 text-orange-500" />;
    }
    if (n.includes('agua') || n.includes('aysa')) {
      return <Droplets className="w-4 h-4 text-cyan-500" />;
    }
    if (n.includes('internet') || n.includes('flow') || n.includes('wifi')) {
      return <Wifi className="w-4 h-4 text-purple-500" />;
    }
    if (n.includes('celular') || n.includes('abono')) {
      return <Smartphone className="w-4 h-4 text-blue-500" />;
    }
    if (n.includes('expensa') || n.includes('alquiler')) {
      return <Home className="w-4 h-4 text-emerald-600" />;
    }
    return <FileText className="w-4 h-4 text-slate-600" />;
  };

  const handleToggleActive = (id: string) => {
    setEditingServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
  };

  const handleAddNewService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const keywords = newServiceKeywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    if (keywords.length === 0) {
      keywords.push(newServiceName.trim().toLowerCase());
    }

    const newService: FixedService = {
      id: `custom-${Date.now()}`,
      name: newServiceName.trim(),
      category: 'Hogar & Servicios',
      defaultMethod: 'CUENTA',
      keywords,
      active: true,
    };

    setEditingServices((prev) => [...prev, newService]);
    setNewServiceName('');
    setNewServiceKeywords('');
  };

  const handleSaveConfig = () => {
    if (onSaveServices) {
      onSaveServices(editingServices);
    }
    setIsConfigOpen(false);
  };

  return (
    <div className="w-full brutal-card p-4 sm:p-5 bg-white border-[3px] border-black shadow-[3px_3px_0px_#000] space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-left group"
        >
          <div className="w-7 h-7 rounded bg-[#FFE500] border-[2px] border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000]">
            📋
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase text-black">
                SERVICIOS FIJOS DEL MES
              </span>
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_#000] ${
                  allPaid
                    ? 'bg-[#22C55E] text-black'
                    : paidCount > 0
                    ? 'bg-[#FFE500] text-black'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {paidCount} de {totalCount} pagados
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-500">
              {allPaid ? '🎉 Todos los servicios al día' : 'Monitoreo de boletas e impuestos'}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          {onSaveServices && (
            <button
              type="button"
              onClick={() => {
                setEditingServices(fixedServices);
                setIsConfigOpen(true);
              }}
              className="p-1.5 rounded hover:bg-slate-100 border border-transparent hover:border-black text-slate-600 transition-colors"
              title="Configurar servicios fijos"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded hover:bg-[#FFE500] border border-black text-black font-black flex items-center gap-1 text-xs shadow-[1.5px_1.5px_0px_#000]"
          >
            <span>{isOpen ? 'Ocultar' : 'Ver detalle'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-slate-100 border-[2px] border-black rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            allPaid ? 'bg-[#22C55E]' : 'bg-[#FFE500]'
          }`}
          style={{ width: `${totalCount > 0 ? (paidCount / totalCount) * 100 : 0}%` }}
        />
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {serviceStatuses.map(({ service, isPaid, paidExpense }) => (
            <div
              key={service.id}
              className={`p-3 rounded-xl border-[2px] border-black shadow-[2px_2px_0px_#000] flex items-center justify-between gap-2.5 transition-all ${
                isPaid ? 'bg-emerald-50/70 border-emerald-950' : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white border-[1.5px] border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#000]">
                  {getServiceIcon(service.name)}
                </div>
                <div className="min-w-0">
                  <span className="font-black text-xs sm:text-sm text-black block truncate">
                    {service.name}
                  </span>
                  {isPaid && paidExpense ? (
                    <span className="text-[11px] font-bold text-emerald-800 font-mono block">
                      ${paidExpense.amount.toLocaleString('es-AR')} • {paidExpense.date}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-700 block">
                      ⏳ Sin registrar
                    </span>
                  )}
                </div>
              </div>

              <div>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Al día</span>
                  </span>
                ) : (
                  onSelectServiceToPay && (
                    <button
                      type="button"
                      onClick={() => onSelectServiceToPay(service)}
                      className="px-2 py-1 bg-[#FFE500] hover:bg-[#ffe01b] text-black font-black text-xs rounded border border-black shadow-[1px_1px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                    >
                      Anotar
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Services Configuration Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white border-[3px] border-black rounded-2xl shadow-[6px_6px_0px_#000] w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between border-b-[2px] border-black pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                <h3 className="font-black text-lg uppercase">Configurar Servicios Fijos</h3>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="w-8 h-8 rounded-lg border border-black flex items-center justify-center hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-bold text-slate-600">
              Marcá qué servicios corresponden a tu hogar. Podés agregar nuevos (ej. Patente, Seguro, etc.).
            </p>

            <div className="space-y-2">
              {editingServices.map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleToggleActive(service.id)}
                  className={`p-3 rounded-lg border-[2px] border-black flex items-center justify-between cursor-pointer transition-colors ${
                    service.active ? 'bg-[#FFE500]/20' : 'bg-slate-100 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {getServiceIcon(service.name)}
                    <span className="font-black text-sm text-black">{service.name}</span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded border border-black flex items-center justify-center font-bold text-xs ${
                      service.active ? 'bg-[#22C55E] text-white' : 'bg-white'
                    }`}
                  >
                    {service.active && '✓'}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Service Form */}
            <form onSubmit={handleAddNewService} className="pt-2 border-t border-slate-200 space-y-2">
              <span className="text-xs font-black uppercase text-slate-700 block">
                Agregar otro servicio
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="Nombre (ej: Patente Auto)"
                  className="h-10 px-3 bg-[#F8F8F8] border border-black rounded-lg text-xs font-bold focus:outline-none focus:bg-white"
                />
                <input
                  type="text"
                  value={newServiceKeywords}
                  onChange={(e) => setNewServiceKeywords(e.target.value)}
                  placeholder="Palabras clave (ej: patente, arba)"
                  className="h-10 px-3 bg-[#F8F8F8] border border-black rounded-lg text-xs font-bold focus:outline-none focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-black rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar a la lista</span>
              </button>
            </form>

            <div className="flex items-center gap-3 pt-3 border-t-[2px] border-black">
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="flex-1 py-2.5 bg-white border-[2px] border-black rounded-xl text-xs font-black uppercase hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="flex-1 py-2.5 bg-[#22C55E] border-[2px] border-black rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:bg-[#1eb353] flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
