import { SalaryConfig, SalaryHistoryItem } from './types';

/**
 * Resolves the exact salary for any given month key ('YYYY-MM' or 'ALL').
 * Follows strict historical integrity:
 * 1. Checks specific month override in `monthlyOverrides[monthKey]`.
 * 2. Checks Paritarias timeline (`history`): picks the latest paritaria where effectiveMonth <= monthKey.
 * 3. Falls back to baseSalary or $1.200.000.
 * 4. For 'ALL', sums the salaries across all active distinct months.
 */
export function getSalaryForMonth(
  config: SalaryConfig | null | undefined,
  monthKey: string,
  availableMonths?: string[]
): number {
  if (!config) return 1200000;

  // Case: 'ALL' (Historic complete view)
  if (monthKey === 'ALL') {
    if (!availableMonths || availableMonths.length === 0) {
      return config.baseSalary ?? 1200000;
    }
    const realMonths = availableMonths.filter(m => m !== 'ALL');
    if (realMonths.length === 0) return config.baseSalary ?? 1200000;

    return realMonths.reduce((total, m) => {
      return total + getSalaryForSingleMonth(config, m);
    }, 0);
  }

  return getSalaryForSingleMonth(config, monthKey);
}

function getSalaryForSingleMonth(config: SalaryConfig, monthKey: string): number {
  // 1. Direct explicit month override (e.g. bonus, aguinaldo, or specific month record)
  if (config.monthlyOverrides && typeof config.monthlyOverrides[monthKey] === 'number') {
    return config.monthlyOverrides[monthKey];
  }

  // 2. Paritaria history timeline (latest increase on or before this month)
  if (config.history && config.history.length > 0) {
    const applicable = config.history
      .filter(item => item.effectiveMonth <= monthKey)
      .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));

    if (applicable.length > 0) {
      return applicable[0].amount;
    }

    // If monthKey is earlier than the earliest recorded paritaria, use the earliest known
    const chronological = [...config.history].sort((a, b) => 
      a.effectiveMonth.localeCompare(b.effectiveMonth)
    );
    return chronological[0].amount;
  }

  // 3. Fallback
  return config.baseSalary ?? 1200000;
}

/**
 * Generates an updated SalaryConfig preserving historical integrity.
 * If isParitaria is true:
 *   - Inserts or updates the paritaria in `history` starting at `monthKey`.
 *   - Sets `monthlyOverrides[monthKey] = amount`.
 *   - If monthKey is the newest or future, updates `baseSalary = amount`.
 * If isParitaria is false:
 *   - Only updates `monthlyOverrides[monthKey] = amount`.
 *   - Keeps `history` and `baseSalary` untouched so other months are not altered.
 */
export function buildUpdatedSalaryConfig(
  currentConfig: SalaryConfig,
  monthKey: string,
  amount: number,
  isParitaria: boolean,
  note?: string
): SalaryConfig {
  const currentOverrides = { ...(currentConfig.monthlyOverrides || {}) };
  const currentHistory: SalaryHistoryItem[] = [...(currentConfig.history || [])];

  currentOverrides[monthKey] = amount;

  let newBaseSalary = currentConfig.baseSalary ?? amount;

  if (isParitaria) {
    const existingIndex = currentHistory.findIndex(h => h.effectiveMonth === monthKey);
    const item: SalaryHistoryItem = {
      id: existingIndex >= 0 ? currentHistory[existingIndex].id : `paritaria-${Date.now()}`,
      effectiveMonth: monthKey,
      amount,
      note: note || (monthKey === '2026-11' ? 'Sueldo Noviembre 2026' : 'Aumento Paritario'),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      currentHistory[existingIndex] = item;
    } else {
      currentHistory.push(item);
    }

    currentHistory.sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth));

    // If this paritaria is on the latest month or in future, update baseSalary
    const latestParitaria = currentHistory[currentHistory.length - 1];
    if (latestParitaria && monthKey >= latestParitaria.effectiveMonth) {
      newBaseSalary = amount;
    }
  }

  return {
    baseSalary: newBaseSalary,
    monthlyOverrides: currentOverrides,
    history: currentHistory,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Returns a sorted list of all historical salary records for the UI.
 */
export function getSortedSalaryHistory(config: SalaryConfig): Array<{
  monthKey: string;
  amount: number;
  isParitaria: boolean;
  note?: string;
}> {
  const map = new Map<string, { amount: number; isParitaria: boolean; note?: string }>();

  // Add history entries
  if (config.history) {
    for (const h of config.history) {
      map.set(h.effectiveMonth, {
        amount: h.amount,
        isParitaria: true,
        note: h.note || 'Paritaria',
      });
    }
  }

  // Add overrides
  if (config.monthlyOverrides) {
    for (const [m, amt] of Object.entries(config.monthlyOverrides)) {
      const existing = map.get(m);
      if (existing) {
        map.set(m, { ...existing, amount: amt });
      } else {
        map.set(m, {
          amount: amt,
          isParitaria: false,
          note: 'Ajuste mensual',
        });
      }
    }
  }

  // If map is empty, ensure at least '2026-11' exists
  if (map.size === 0) {
    map.set('2026-11', {
      amount: config.baseSalary ?? 1200000,
      isParitaria: true,
      note: 'Sueldo Noviembre 2026',
    });
  }

  return Array.from(map.entries())
    .map(([monthKey, val]) => ({
      monthKey,
      amount: val.amount,
      isParitaria: val.isParitaria,
      note: val.note,
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
