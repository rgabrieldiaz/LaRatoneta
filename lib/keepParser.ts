import { Category, Expense, PaymentMethod } from './types';

interface MethodOverrideResult {
  cleanedText: string;
  explicitMethod?: PaymentMethod;
  explicitNote?: string;
}

/**
 * Extracts explicit payment method phrases (e.g. "pagado en efectivo", "credito", "ripio", "mp")
 * from anywhere in the input string so the title and amount stay clean.
 */
function extractExplicitMethod(raw: string): MethodOverrideResult {
  let text = raw;
  let explicitMethod: PaymentMethod | undefined;
  let explicitNote: string | undefined;

  const patterns: { regex: RegExp; method: PaymentMethod; note?: string }[] = [
    { regex: /\b(?:pagado\s+en\s+|en\s+|con\s+)?(efectivo|efvo|cash)\b/i, method: 'EFECTIVO' },
    { regex: /\b(?:pagado\s+con\s+|con\s+|en\s+)?(apple\s*pay)\b/i, method: 'CREDITO', note: 'Apple Pay Crédito' },
    { regex: /\b(?:pagado\s+con\s+|con\s+|en\s+)?(cr[eé]dito|tarjeta\s+de\s+cr[eé]dito|visa|amex|mastercard)\b/i, method: 'CREDITO' },
    { regex: /\b(?:pagado\s+con\s+|con\s+|en\s+)?(ripio)\b/i, method: 'CUENTA', note: 'Ripio Prepaga NFC' },
    { regex: /\b(?:pagado\s+con\s+|con\s+|en\s+)?(personal\s*pay)\b/i, method: 'CUENTA', note: 'Personal Pay' },
    { regex: /\b(?:pagado\s+con\s+|con\s+|en\s+)?(mercado\s*pago|mp)\b/i, method: 'CUENTA', note: 'Mercado Pago' },
    { regex: /\b(?:pagado\s+con\s+|con\s+|en\s+)?(modo)\b/i, method: 'CUENTA', note: 'MODO' },
    { regex: /\b(?:pagado\s+con\s+|con\s+|en\s+)?(d[eé]bito|cuenta|transferencia|transf)\b/i, method: 'CUENTA' },
    { regex: /\b(?:pagado\s+con\s+|con\s+|en\s+)?(sube)\b/i, method: 'SUBE' },
  ];

  for (const p of patterns) {
    if (p.regex.test(text)) {
      // Only strip if it's not the ONLY word before the amount (e.g. "Sube 900" should keep "Sube" as title!)
      const without = text.replace(p.regex, ' ').replace(/\s+/g, ' ').trim();
      const hasRemainingWords = /[a-zA-ZñÑáéíóúÁÉÍÓÚ]{2,}/.test(without.replace(/[\d\.,]/g, ''));
      explicitMethod = p.method;
      if (p.note) explicitNote = p.note;
      if (hasRemainingWords) {
        text = without;
      }
      break;
    }
  }

  return { cleanedText: text.trim(), explicitMethod, explicitNote };
}

export function parseRawKeepText(text: string): Expense[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const expenses: Expense[] = [];

  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const { cleanedText, explicitMethod, explicitNote } = extractExplicitMethod(rawLine);

    // Match title and amount: supports "Chino 19510" or "19510 Chino"
    const endAmountMatch = cleanedText.match(/^(.*?)\s+([\d\.,]+)$/);
    const startAmountMatch = !endAmountMatch ? cleanedText.match(/^([\d\.,]+)\s+(.*)$/) : null;

    let rawTitle = '';
    let rawAmountStr = '';

    if (endAmountMatch) {
      rawTitle = endAmountMatch[1].trim();
      rawAmountStr = endAmountMatch[2];
    } else if (startAmountMatch) {
      rawAmountStr = startAmountMatch[1];
      rawTitle = startAmountMatch[2].trim();
    }

    if (rawTitle && rawAmountStr) {
      const normalizedAmount = rawAmountStr.replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(normalizedAmount);

      if (!isNaN(amount) && amount > 0) {
        const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
        const inferred = inferCategoryAndMethod(rawTitle);

        const finalMethod = explicitMethod ?? inferred.method;
        const finalNote = explicitNote ?? inferred.note;

        expenses.push({
          id: `parsed-${Date.now()}-${i}`,
          title,
          amount,
          currency: 'ARS',
          category: inferred.category,
          method: finalMethod,
          date: todayStr,
          isConfirmed: true,
          source: 'KEEP_BATCH',
          ...(finalNote ? { note: finalNote } : {}),
        });
      }
    }
  }

  return expenses;
}

export function inferCategoryAndMethod(title: string): {
  category: Category;
  method: PaymentMethod;
  note?: string;
} {
  const t = title.toLowerCase();

  // 1. Supermercados
  if (
    t.includes('chino') ||
    t.includes('carrefour') ||
    t.includes('coto') ||
    t.includes('día') ||
    t.includes('dia') ||
    t.includes('supermercado')
  ) {
    const isChino = t.includes('chino');
    const isRipio = t.includes('coto') || t.includes('carrefour') || t.includes('día') || t.includes('dia');
    return {
      category: 'Supermercados',
      method: isChino ? 'EFECTIVO' : 'CUENTA',
      note: isRipio ? 'Ripio Prepaga NFC' : undefined,
    };
  }

  // 2. Frescos & Panadería
  if (
    t.includes('carniceria') ||
    t.includes('carnicería') ||
    t.includes('verduleria') ||
    t.includes('verdulería') ||
    t.includes('fiambreria') ||
    t.includes('fiambrería') ||
    t.includes('dietetica') ||
    t.includes('dietética') ||
    t.includes('panaderia') ||
    t.includes('panadería') ||
    t.includes('pastas')
  ) {
    const isModoOrCuenta =
      t.includes('carniceria') ||
      t.includes('carnicería') ||
      t.includes('fiambreria') ||
      t.includes('fiambrería') ||
      t.includes('dietetica') ||
      t.includes('dietética') ||
      t.includes('pastas');
    return {
      category: 'Frescos & Panadería',
      method: isModoOrCuenta ? 'CUENTA' : 'EFECTIVO',
      note: isModoOrCuenta ? 'MODO / Billetera' : undefined,
    };
  }

  // 3. Comida & Salidas
  if (
    t.includes('comida') ||
    t.includes('pizza') ||
    t.includes('sandwich') ||
    t.includes('sándwich') ||
    t.includes('empanada') ||
    t.includes('kfc') ||
    t.includes('pons') ||
    t.includes('restaurante') ||
    t.includes('cafe') ||
    t.includes('café') ||
    t.includes('bar')
  ) {
    if (t.includes('pons')) {
      return {
        category: 'Comida & Salidas',
        method: 'CREDITO',
        note: 'Galicia Visa (Apple Pay NFC)',
      };
    }
    const isCashFood = t.includes('al peso');
    return {
      category: 'Comida & Salidas',
      method: isCashFood ? 'EFECTIVO' : 'CUENTA',
      note: isCashFood ? undefined : 'Mercado Pago / Billetera',
    };
  }

  // 4. Hogar & Servicios
  if (
    t.includes('expensa') ||
    t.includes('termo') ||
    t.includes('personal') ||
    t.includes('sindicato') ||
    t.includes('luz') ||
    t.includes('gas') ||
    t.includes('agua') ||
    t.includes('wifi') ||
    t.includes('alquiler')
  ) {
    if (t.includes('personal')) {
      return {
        category: 'Hogar & Servicios',
        method: 'CUENTA',
        note: 'Personal Pay (saldo)',
      };
    }
    return {
      category: 'Hogar & Servicios',
      method: 'CUENTA',
      note: 'Transferencia bancaria',
    };
  }

  // 5. Transporte
  if (t.includes('cabify') || t.includes('uber') || t.includes('taxi') || t.includes('didi')) {
    return {
      category: 'Transporte',
      method: 'CUENTA',
      note: 'Mercado Pago / Billetera',
    };
  }
  if (t.includes('sube') || t.includes('colectivo') || t.includes('tren') || t.includes('subte') || t.includes('transporte')) {
    return {
      category: 'Transporte',
      method: 'SUBE',
      note: 'Carga / Viaje SUBE',
    };
  }

  // 6. Salud & Farmacia
  if (
    t.includes('farmacia') ||
    t.includes('hospital') ||
    t.includes('britanico') ||
    t.includes('británico') ||
    t.includes('medico') ||
    t.includes('suplemento') ||
    t.includes('remedio')
  ) {
    return {
      category: 'Salud & Farmacia',
      method: 'CUENTA',
      note: 'Débito / Cuenta',
    };
  }

  // 7. Default: Cuidado & Varios
  return {
    category: 'Cuidado & Varios',
    method: 'EFECTIVO',
  };
}
