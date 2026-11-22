import { IncomeEntry, IncomeType, SalaryConfig, SalaryHistoryItem } from './types';

/**
 * Returns the active list of IncomeEntry items for a specific month ('YYYY-MM').
 * Preserves historical integrity:
 * - Repeating incomes (Sueldo, Jubilación, Pensión) inherit the most recent value <= monthKey.
 * - One-off incomes (repeatsMonthly: false) apply only to their exact effectiveMonth.
 */
export function getIncomesForMonth(
  config: SalaryConfig | null | undefined,
  monthKey: string
): IncomeEntry[] {
  if (!config) {
    return [
      {
        id: 'default-sueldo',
        type: 'SUELDO',
        label: 'Sueldo',
        amount: 1200000,
        effectiveMonth: '2026-11',
        repeatsMonthly: true,
      },
    ];
  }

  // If multi-income entries exist, resolve each source independently for monthKey
  if (config.incomes && config.incomes.length > 0) {
    const resolved: IncomeEntry[] = [];

    // Group repeating incomes by (type + normalized label) so updates in month M don't overwrite month M-1
    const repeatingGroups = new Map<string, IncomeEntry[]>();
    for (const item of config.incomes) {
      if (!item.repeatsMonthly) {
        if (item.effectiveMonth === monthKey) {
          resolved.push(item);
        }
      } else {
        const key = `${item.type}::${item.label.trim().toLowerCase()}`;
        const list = repeatingGroups.get(key) || [];
        list.push(item);
        repeatingGroups.set(key, list);
      }
    }

    for (const entries of Array.from(repeatingGroups.values())) {
      const applicable = entries
        .filter((e) => e.effectiveMonth <= monthKey)
        .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));

      if (applicable.length > 0) {
        if (applicable[0].amount > 0) {
          resolved.push(applicable[0]);
        }
      } else if (entries.length > 0) {
        // Fallback for months before the first recorded entry of a core Sueldo
        const earliest = [...entries].sort((a, b) =>
          a.effectiveMonth.localeCompare(b.effectiveMonth)
        )[0];
        if (earliest.type === 'SUELDO' && earliest.amount > 0) {
          resolved.push(earliest);
        }
      }
    }

    return resolved;
  }

  // Legacy fallback (single Sueldo)
  const amount = getLegacySalaryForSingleMonth(config, monthKey);
  return [
    {
      id: 'legacy-sueldo',
      type: 'SUELDO',
      label: 'Sueldo',
      amount,
      effectiveMonth: monthKey,
      repeatsMonthly: true,
    },
  ];
}

/**
 * Resolves total monthly income (Sueldo + Jubilación + Pensión + Otros) for 'YYYY-MM' or 'ALL'.
 */
export function getSalaryForMonth(
  config: SalaryConfig | null | undefined,
  monthKey: string,
  availableMonths?: string[]
): number {
  if (!config) return 1200000;

  if (monthKey === 'ALL') {
    const realMonths = (availableMonths || []).filter((m) => m !== 'ALL');
    if (realMonths.length === 0) {
      return getIncomesForMonth(config, '2026-11').reduce((s, i) => s + i.amount, 0);
    }
    return realMonths.reduce((total, m) => {
      const monthSum = getIncomesForMonth(config, m).reduce((s, i) => s + i.amount, 0);
      return total + monthSum;
    }, 0);
  }

  return getIncomesForMonth(config, monthKey).reduce((s, i) => s + i.amount, 0);
}

function getLegacySalaryForSingleMonth(config: SalaryConfig, monthKey: string): number {
  if (config.monthlyOverrides && typeof config.monthlyOverrides[monthKey] === 'number') {
    return config.monthlyOverrides[monthKey];
  }
  if (config.history && config.history.length > 0) {
    const applicable = config.history
      .filter((item) => item.effectiveMonth <= monthKey)
      .sort((a, b) => b.effectiveMonth.localeCompare(a.effectiveMonth));
    if (applicable.length > 0) return applicable[0].amount;
    const chronological = [...config.history].sort((a, b) =>
      a.effectiveMonth.localeCompare(b.effectiveMonth)
    );
    return chronological[0].amount;
  }
  return config.baseSalary ?? 1200000;
}

/**
 * Adds or updates an IncomeEntry while preserving historical records for previous months.
 */
export function upsertIncomeInConfig(
  currentConfig: SalaryConfig,
  entry: Omit<IncomeEntry, 'id' | 'updatedAt'> & { id?: string }
): SalaryConfig {
  // Ensure existing legacy salary is materialized into `incomes` before adding new ones
  let incomes: IncomeEntry[] =
    currentConfig.incomes && currentConfig.incomes.length > 0
      ? [...currentConfig.incomes]
      : [
          {
            id: 'inc-sueldo-base',
            type: 'SUELDO',
            label: 'Sueldo',
            amount: currentConfig.baseSalary ?? 1200000,
            effectiveMonth: '2026-11',
            repeatsMonthly: true,
          },
        ];

  const normalizedLabel = entry.label.trim() || defaultLabelForType(entry.type);

  // Check if an entry for the exact same month + type + label already exists -> update it
  const existingIdx = incomes.findIndex(
    (i) =>
      (entry.id && i.id === entry.id) ||
      (i.effectiveMonth === entry.effectiveMonth &&
        i.type === entry.type &&
        i.label.trim().toLowerCase() === normalizedLabel.toLowerCase())
  );

  const newEntry: IncomeEntry = {
    id:
      existingIdx >= 0
        ? incomes[existingIdx].id
        : `inc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: entry.type,
    label: normalizedLabel,
    amount: entry.amount,
    effectiveMonth: entry.effectiveMonth,
    repeatsMonthly: entry.repeatsMonthly,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    incomes[existingIdx] = newEntry;
  } else {
    incomes.push(newEntry);
  }

  // Keep legacy fields synced for backwards compatibility
  const monthTotal = getIncomesForMonth({ ...currentConfig, incomes }, entry.effectiveMonth).reduce(
    (s, i) => s + i.amount,
    0
  );

  return {
    ...currentConfig,
    baseSalary: entry.type === 'SUELDO' && entry.repeatsMonthly ? entry.amount : currentConfig.baseSalary,
    monthlyOverrides: {
      ...(currentConfig.monthlyOverrides || {}),
      [entry.effectiveMonth]: monthTotal,
    },
    incomes,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Removes an IncomeEntry by id.
 */
export function removeIncomeFromConfig(currentConfig: SalaryConfig, incomeId: string): SalaryConfig {
  const incomes = (currentConfig.incomes || []).filter((i) => i.id !== incomeId);
  return {
    ...currentConfig,
    incomes,
    updatedAt: new Date().toISOString(),
  };
}

export function defaultLabelForType(type: IncomeType): string {
  switch (type) {
    case 'SUELDO':
      return 'Sueldo';
    case 'JUBILACION':
      return 'Jubilación';
    case 'PENSION':
      return 'Pensión';
    case 'OTRO':
      return 'Otro ingreso';
  }
}

export function buildUpdatedSalaryConfig(
  currentConfig: SalaryConfig,
  monthKey: string,
  amount: number,
  isParitaria: boolean,
  note?: string
): SalaryConfig {
  return upsertIncomeInConfig(currentConfig, {
    type: 'SUELDO',
    label: note || 'Sueldo',
    amount,
    effectiveMonth: monthKey,
    repeatsMonthly: isParitaria,
  });
}

export function getSortedSalaryHistory(config: SalaryConfig): Array<{
  monthKey: string;
  amount: number;
  entries: IncomeEntry[];
}> {
  const months = new Set<string>();
  if (config.incomes) {
    config.incomes.forEach((i) => months.add(i.effectiveMonth));
  }
  if (config.monthlyOverrides) {
    Object.keys(config.monthlyOverrides).forEach((m) => months.add(m));
  }
  if (months.size === 0) months.add('2026-11');

  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map((m) => {
      const entries = getIncomesForMonth(config, m);
      return {
        monthKey: m,
        amount: entries.reduce((s, i) => s + i.amount, 0),
        entries,
      };
    });
}
