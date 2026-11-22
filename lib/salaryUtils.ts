import { IncomeEntry, IncomeType, SalaryConfig } from './types';

/**
 * Returns the active list of IncomeEntry items for a specific month ('YYYY-MM'),
 * sorted by user-defined order.
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
        order: 0,
      },
    ];
  }

  if (config.incomes && config.incomes.length > 0) {
    const resolved: IncomeEntry[] = [];

    // Group repeating incomes by their logical stream (id prefix or type+label)
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
        const earliest = [...entries].sort((a, b) =>
          a.effectiveMonth.localeCompare(b.effectiveMonth)
        )[0];
        if (earliest.type === 'SUELDO' && earliest.amount > 0) {
          resolved.push(earliest);
        }
      }
    }

    return resolved.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
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
      order: 0,
    },
  ];
}

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

function ensureMaterializedIncomes(currentConfig: SalaryConfig): IncomeEntry[] {
  if (currentConfig.incomes && currentConfig.incomes.length > 0) {
    return [...currentConfig.incomes];
  }
  return [
    {
      id: 'inc-sueldo-base',
      type: 'SUELDO',
      label: 'Sueldo',
      amount: currentConfig.baseSalary ?? 1200000,
      effectiveMonth: '2026-11',
      repeatsMonthly: true,
      order: 0,
    },
  ];
}

/**
 * Adds a new IncomeEntry OR updates an existing one by id.
 * Allows multiple entries of the same type (e.g. 2nd Sueldo, 2nd Jubilación).
 */
export function upsertIncomeInConfig(
  currentConfig: SalaryConfig,
  entry: Omit<IncomeEntry, 'id' | 'updatedAt'> & { id?: string }
): SalaryConfig {
  const incomes = ensureMaterializedIncomes(currentConfig);
  const normalizedLabel = entry.label.trim() || defaultLabelForType(entry.type);

  const isLegacyEdit =
    entry.id === 'legacy-sueldo' || entry.id === 'default-sueldo';

  const existingIdx = isLegacyEdit
    ? incomes.findIndex((i) => i.id === 'inc-sueldo-base' || i.type === 'SUELDO')
    : entry.id
    ? incomes.findIndex((i) => i.id === entry.id)
    : -1;

  const maxOrder = incomes.reduce((max, i) => Math.max(max, i.order ?? 0), -1);

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
    order: existingIdx >= 0 ? (incomes[existingIdx].order ?? existingIdx) : maxOrder + 1,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    incomes[existingIdx] = newEntry;
  } else {
    incomes.push(newEntry);
  }

  const monthTotal = getIncomesForMonth({ ...currentConfig, incomes }, entry.effectiveMonth).reduce(
    (s, i) => s + i.amount,
    0
  );

  return {
    ...currentConfig,
    baseSalary:
      entry.type === 'SUELDO' && entry.repeatsMonthly && existingIdx <= 0
        ? entry.amount
        : currentConfig.baseSalary,
    monthlyOverrides: {
      ...(currentConfig.monthlyOverrides || {}),
      [entry.effectiveMonth]: monthTotal,
    },
    incomes,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Reorders an income UP or DOWN within the active month's list.
 */
export function reorderIncomeInConfig(
  currentConfig: SalaryConfig,
  monthKey: string,
  incomeId: string,
  direction: 'UP' | 'DOWN'
): SalaryConfig {
  const incomes = ensureMaterializedIncomes(currentConfig);
  const active = getIncomesForMonth({ ...currentConfig, incomes }, monthKey);

  const idx = active.findIndex((i) => i.id === incomeId);
  if (idx < 0) return currentConfig;

  const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= active.length) return currentConfig;

  // Normalize sequential order on active items, then swap
  const orderedIds = active.map((a) => a.id);
  const temp = orderedIds[idx];
  orderedIds[idx] = orderedIds[swapIdx];
  orderedIds[swapIdx] = temp;

  const updatedIncomes = incomes.map((item) => {
    const pos = orderedIds.indexOf(item.id);
    if (pos >= 0) {
      return { ...item, order: pos };
    }
    return item;
  });

  return {
    ...currentConfig,
    incomes: updatedIncomes,
    updatedAt: new Date().toISOString(),
  };
}

export function removeIncomeFromConfig(currentConfig: SalaryConfig, incomeId: string): SalaryConfig {
  const incomes = ensureMaterializedIncomes(currentConfig).filter((i) => i.id !== incomeId);
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
