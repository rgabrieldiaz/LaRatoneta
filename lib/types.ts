export type Currency = 'ARS' | 'USD';

export type PaymentMethod = 
  | 'EFECTIVO'
  | 'CUENTA'      // Plata en cuenta al contado: Débito, Prepagas (Ripio), Billeteras (Personal Pay, MP, MODO cuenta), Transferencias
  | 'CREDITO'     // Tarjeta de Crédito (Visa, Amex, Apple Pay crédito, MODO crédito)
  | 'SUBE';       // Recargas SUBE

export type Category = 
  | 'Supermercados'
  | 'Frescos & Panadería'
  | 'Comida & Salidas'
  | 'Hogar & Servicios'
  | 'Transporte'
  | 'Salud & Farmacia'
  | 'Cuidado & Varios'
  | 'Resúmenes Tarjeta';

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

export type IncomeType = 'SUELDO' | 'JUBILACION' | 'PENSION' | 'OTRO';

export interface IncomeEntry {
  id: string;
  type: IncomeType;
  label: string;
  amount: number;
  effectiveMonth: string; // "YYYY-MM"
  repeatsMonthly: boolean;
  order?: number;
  updatedAt?: string;
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
  incomes?: IncomeEntry[];
  updatedAt?: string;
}

export type CategoryBudgets = Partial<Record<Category, number>>;

export interface MerchantRule {
  category: Category;
  method?: PaymentMethod;
  updatedAt?: string;
}

export type MerchantRulesMap = Record<string, MerchantRule>;
