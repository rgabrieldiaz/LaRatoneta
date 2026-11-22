import { Expense } from './types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Returns YYYY-MM from a date string (YYYY-MM-DD or ISO)
 */
export function getMonthKey(dateStr: string): string {
  if (!dateStr) return '2026-11';
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return '2026-11';
}

/**
 * Formats YYYY-MM into 'Noviembre 2026'
 */
export function formatMonthLabel(monthKey: string): string {
  if (monthKey === 'ALL') return 'Histórico Completo';
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  const year = parts[0];
  const monthIndex = parseInt(parts[1], 10) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    return `${MONTH_NAMES[monthIndex]} ${year}`;
  }
  return monthKey;
}

/**
 * Gets unique months present in expenses, sorted descending (most recent first)
 */
export function getAvailableMonths(expenses: Expense[]): string[] {
  const monthsSet = new Set<string>();
  
  // Always include 2026-11 since that's when Gretel's initial batch starts
  monthsSet.add('2026-11');

  // Also include current calendar month
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthsSet.add(currentKey);

  for (const exp of expenses) {
    if (exp.date) {
      monthsSet.add(getMonthKey(exp.date));
    }
  }

  return Array.from(monthsSet).sort().reverse();
}

/**
 * Filter expenses by monthKey ('YYYY-MM' or 'ALL')
 */
export function filterExpensesByMonth(expenses: Expense[], monthKey: string): Expense[] {
  if (monthKey === 'ALL') return expenses;
  return expenses.filter(e => getMonthKey(e.date) === monthKey);
}
