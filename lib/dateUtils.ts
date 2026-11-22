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

/**
 * Adds months to a YYYY-MM-DD date string, handling year rollover and day clamping.
 */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  if (!dateStr || monthsToAdd === 0) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;

  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1; // 0-based
  let day = parseInt(parts[2], 10);

  month += monthsToAdd;
  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;

  // Clamp day to max days in target month
  const maxDays = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, maxDays);

  const finalYear = String(year);
  const finalMonth = String(month + 1).padStart(2, '0');
  const finalDay = String(clampedDay).padStart(2, '0');

  return `${finalYear}-${finalMonth}-${finalDay}`;
}

/**
 * Creates an array of installment Expenses for a credit purchase.
 */
export function generateInstallmentExpenses(
  baseExpense: Omit<Expense, 'id'>,
  totalInstallments: number
): Expense[] {
  if (totalInstallments <= 1) {
    return [
      {
        ...baseExpense,
        id: `manual-${Date.now()}`,
      },
    ];
  }

  const parentId = `inst-${Date.now()}`;
  const totalAmount = baseExpense.amount;
  const installmentAmount = Math.round(totalAmount / totalInstallments);
  // Remainder added to first installment so sum matches exactly
  const remainder = totalAmount - installmentAmount * totalInstallments;

  const result: Expense[] = [];
  for (let i = 1; i <= totalInstallments; i++) {
    const isFirst = i === 1;
    const currentAmount = isFirst ? installmentAmount + remainder : installmentAmount;
    const installmentDate = addMonthsToDate(baseExpense.date, i - 1);
    const baseNote = baseExpense.note ? ` • ${baseExpense.note}` : '';
    const installmentNote = `Cuota ${i}/${totalInstallments}${baseNote}`;

    result.push({
      ...baseExpense,
      id: `${parentId}-${i}`,
      amount: currentAmount,
      date: installmentDate,
      note: installmentNote,
      installments: {
        current: i,
        total: totalInstallments,
        parentId,
      },
    });
  }

  return result;
}

