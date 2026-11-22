import { FALLBACK_DOLAR_MEP } from './dolarApi';
import { Category, Expense, MerchantRulesMap, PaymentMethod } from './types';

const GENERIC_WORDS = new Set([
  'compra',
  'gasto',
  'varios',
  'pago',
  'otro',
  'otros',
  'comida',
  'tarjeta',
  'transferencia',
  'efectivo',
  'regalo',
]);

/**
 * Normalizes a merchant title into a safe lookup key, filtering out generic words
 * so we never accidentally learn an overly broad rule.
 */
export function normalizeMerchantKey(title: string): string | null {
  const cleaned = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');

  if (cleaned.length < 3 || /^\d+$/.test(cleaned) || GENERIC_WORDS.has(cleaned)) {
    return null;
  }
  return cleaned;
}

interface MethodOverrideResult {
  cleanedText: string;
  explicitMethod?: PaymentMethod;
  explicitNote?: string;
}

/**
 * Extracts explicit payment method phrases from anywhere in the input string.
 * Handles natural spoken/typed phrases like "con tarjeta de crédito", "pagado en efectivo", etc.
 */
function extractExplicitMethod(raw: string): MethodOverrideResult {
  let text = raw;
  let explicitMethod: PaymentMethod | undefined;
  let explicitNote: string | undefined;

  const patterns: { regex: RegExp; method: PaymentMethod; note?: string }[] = [
    { regex: /\b(?:pagad[oa]\s+|pagu[eé]\s+|con\s+|en\s+)?(?:tarjeta\s+de\s+cr[eé]dito|cr[eé]dito|visa|amex|mastercard)\b/i, method: 'CREDITO' },
    { regex: /\b(?:pagad[oa]\s+|pagu[eé]\s+|con\s+|en\s+)?(apple\s*pay)\b/i, method: 'CREDITO', note: 'Apple Pay Crédito' },
    { regex: /\b(?:pagad[oa]\s+|pagu[eé]\s+|con\s+|en\s+)?(efectivo|efvo|cash)\b/i, method: 'EFECTIVO' },
    { regex: /\b(?:pagad[oa]\s+|pagu[eé]\s+|con\s+|en\s+)?(ripio)\b/i, method: 'CUENTA', note: 'Ripio Prepaga NFC' },
    { regex: /\b(?:pagad[oa]\s+|pagu[eé]\s+|con\s+|en\s+)?(personal\s*pay)\b/i, method: 'CUENTA', note: 'Personal Pay' },
    { regex: /\b(?:pagad[oa]\s+|pagu[eé]\s+|con\s+|en\s+)?(mercado\s*pago|mp)\b/i, method: 'CUENTA', note: 'Mercado Pago' },
    { regex: /\b(?:pagad[oa]\s+|pagu[eé]\s+|con\s+|en\s+)?(modo)\b/i, method: 'CUENTA', note: 'MODO' },
    { regex: /\b(?:pagad[oa]\s+|pagu[eé]\s+|con\s+|en\s+|por\s+)?(?:tarjeta\s+de\s+d[eé]bito|d[eé]bito|cuenta|transferencia|transf)\b/i, method: 'CUENTA' },
    { regex: /\b(?:pagad[oa]\s+|pagu[eé]\s+|con\s+|en\s+)?(sube)\b/i, method: 'SUBE' },
  ];

  for (const p of patterns) {
    if (p.regex.test(text)) {
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

/**
 * Strips spoken filler words and currency terms ("pesos", "dólares", "$", "pagué en el", etc.)
 */
function cleanSpokenNoise(text: string): { cleaned: string; isUSD: boolean } {
  const usdRegex = /\b(?:u\$s|usd|d[oó]lares?|dol)\b/gi;
  const isUSD = usdRegex.test(text);
  const cleaned = text
    .replace(/u\$s/gi, ' ')
    .replace(usdRegex, ' ')
    .replace(/\$/g, ' ')
    .replace(/\b(pesos?|ars)\b/gi, ' ')
    .replace(/^\s*(?:pagu[eé]|pag[oó]|gast[eé]|compr[eé]|fui)\s+(?:en\s+el\s+|en\s+la\s+|en\s+|al\s+|a\s+la\s+|a\s+)?/i, '')
    .replace(/^\s*(?:en\s+el|en\s+la|al|a\s+la)\s+/i, '')
    .replace(/\s+(?:con|en)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { cleaned, isUSD };
}

export function parseRawKeepText(
  text: string,
  dolarMepRate: number = FALLBACK_DOLAR_MEP,
  customRules?: MerchantRulesMap
): Expense[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const expenses: Expense[] = [];

  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const { cleanedText, explicitMethod, explicitNote } = extractExplicitMethod(rawLine);
    const { cleaned: noNoise, isUSD } = cleanSpokenNoise(cleanedText);

    // Find the amount anywhere in the sentence (e.g. "20000", "20.000", "0,99", "0.99")
    const numMatch = noNoise.match(/(?:^|\s)([\d]+(?:[\.,]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d+)?)(?=\s|$)/);
    if (!numMatch) continue;

    const rawAmountStr = numMatch[1];
    let parsedNumber: number;
    if (isUSD) {
      // For USD, both "0,99" and "0.99" are decimal separators
      parsedNumber = parseFloat(rawAmountStr.replace(',', '.'));
    } else {
      parsedNumber = rawAmountStr.includes(',')
        ? parseFloat(rawAmountStr.replace(/\./g, '').replace(',', '.'))
        : parseFloat(rawAmountStr.replace(/\./g, ''));
    }

    if (isNaN(parsedNumber) || parsedNumber <= 0) continue;

    const amount = isUSD ? Math.round(parsedNumber * dolarMepRate) : parsedNumber;

    const rawTitle = noNoise
      .replace(numMatch[0], ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!rawTitle) continue;

    const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
    const inferred = inferCategoryAndMethod(rawTitle, customRules);

    const finalMethod = explicitMethod ?? inferred.method;
    const baseNote = explicitMethod ? explicitNote : inferred.note;
    const usdNote = isUSD
      ? `🇺🇸 U$S ${parsedNumber.toFixed(2)} (Dólar MEP $${Math.round(dolarMepRate).toLocaleString('es-AR')})`
      : undefined;
    const finalNote = [usdNote, baseNote].filter(Boolean).join(' • ') || undefined;

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

  return expenses;
}

export function inferCategoryAndMethod(
  title: string,
  customRules?: MerchantRulesMap
): {
  category: Category;
  method: PaymentMethod;
  note?: string;
} {
  if (customRules) {
    const norm = normalizeMerchantKey(title);
    if (norm && customRules[norm]) {
      const exactRule = customRules[norm];
      return {
        category: exactRule.category,
        method: exactRule.method || 'CUENTA',
      };
    }
    if (norm) {
      let bestMatchKey = '';
      for (const key of Object.keys(customRules)) {
        if (key.length >= 4 && (norm.includes(key) || key.includes(norm))) {
          if (key.length > bestMatchKey.length) {
            bestMatchKey = key;
          }
        }
      }
      if (bestMatchKey) {
        const partialRule = customRules[bestMatchKey];
        return {
          category: partialRule.category,
          method: partialRule.method || 'CUENTA',
        };
      }
    }
  }

  const t = title.toLowerCase();

  // 1. Supermercados
  if (
    t.includes('chino') ||
    t.includes('carrefour') ||
    t.includes('coto') ||
    t.includes('día') ||
    t.includes('dia') ||
    t.includes('jumbo') ||
    t.includes('disco') ||
    t.includes('vea') ||
    t.includes('supermercado') ||
    t.includes('almacen') ||
    t.includes('almacén')
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
    t.includes('pastas') ||
    t.includes('polleria') ||
    t.includes('pescaderia')
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
    t.includes('mcdonald') ||
    t.includes('mc donald') ||
    t.includes('burger') ||
    t.includes('mostaza') ||
    t.includes('wendy') ||
    t.includes('starbucks') ||
    t.includes('helad') ||
    t.includes('grido') ||
    t.includes('freddo') ||
    t.includes('restaurante') ||
    t.includes('cafe') ||
    t.includes('café') ||
    t.includes('bar') ||
    t.includes('rappi') ||
    t.includes('pedidosya')
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
    t.includes('edesur') ||
    t.includes('edenor') ||
    t.includes('gas') ||
    t.includes('metrogas') ||
    t.includes('agua') ||
    t.includes('aysa') ||
    t.includes('abl') ||
    t.includes('wifi') ||
    t.includes('internet') ||
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
  if (t.includes('cabify') || t.includes('uber') || t.includes('taxi') || t.includes('didi') || t.includes('nafta') || t.includes('ypf') || t.includes('shell')) {
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
    t.includes('farmacity') ||
    t.includes('hospital') ||
    t.includes('britanico') ||
    t.includes('británico') ||
    t.includes('medico') ||
    t.includes('médico') ||
    t.includes('suplemento') ||
    t.includes('remedio')
  ) {
    return {
      category: 'Salud & Farmacia',
      method: 'CUENTA',
      note: 'Débito / Cuenta',
    };
  }

  // 7. Suscripciones digitales (iCloud, Netflix, Spotify, Google, etc.)
  if (
    t.includes('icloud') ||
    t.includes('netflix') ||
    t.includes('spotify') ||
    t.includes('google') ||
    t.includes('youtube') ||
    t.includes('chatgpt') ||
    t.includes('disney') ||
    t.includes('amazon') ||
    t.includes('suscripcion') ||
    t.includes('suscripción')
  ) {
    return {
      category: 'Cuidado & Varios',
      method: 'CREDITO',
    };
  }

  // 8. Default: Cuidado & Varios
  return {
    category: 'Cuidado & Varios',
    method: 'EFECTIVO',
  };
}
