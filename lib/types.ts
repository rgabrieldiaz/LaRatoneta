export type Currency = 'ARS' | 'USD';

export type PaymentMethod = 
  | 'EFECTIVO'
  | 'MERCADO_PAGO'
  | 'MODO'
  | 'DEBITO'
  | 'CREDITO'
  | 'TRANSFERENCIA'
  | 'SUBE';

export type Category = 
  | 'Super & Chinos'
  | 'Comida & Salidas'
  | 'Carnicería, Verdura & Frescos'
  | 'Panadería & Pastas'
  | 'Hogar & Servicios'
  | 'Transporte'
  | 'Salud & Farmacia'
  | 'Tarjetas'
  | 'Varios & Cuidado';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  category: Category;
  method: PaymentMethod;
  date: string;
  isConfirmed: boolean;
  source: 'MANUAL' | 'KEEP_BATCH' | 'NOTIFICATION' | 'EMAIL';
  note?: string;
}

export interface SalaryHistoryItem {
  id: string;
  effectiveMonth: string; // "YYYY-MM"
  amount: number;
  note?: string;
  updatedAt?: string;
}

export interface SalaryConfig {
  baseSalary: number;
  monthlyOverrides: Record<string, number>;
  history?: SalaryHistoryItem[];
  updatedAt?: string;
}
