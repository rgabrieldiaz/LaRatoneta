import { Category, Expense, PaymentMethod } from './types';

export function parseRawKeepText(text: string): Expense[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const expenses: Expense[] = [];

  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Special case for USD: e.g. "Tarjeta 0,99 dol", "0.99 usd"
    const dolMatch = line.match(/^(.*?)\s*([\d\.,]+)\s*(?:dol|usd|dólar|dolar|dolares)/i);
    if (dolMatch) {
      const title = dolMatch[1].trim() || 'Gasto USD';
      const amount = parseFloat(dolMatch[2].replace(',', '.'));
      expenses.push({
        id: `parsed-${Date.now()}-${i}`,
        title: title || 'Gasto en Dólares',
        amount: isNaN(amount) ? 0 : amount,
        currency: 'USD',
        category: 'Resúmenes Tarjeta',
        method: 'CREDITO',
        date: todayStr,
        isConfirmed: true,
        source: 'KEEP_BATCH',
        note: 'Consumo en USD con Tarjeta de Crédito',
      });
      continue;
    }

    // General pattern: Title + Amount at end: "Chino 19510", "Comida al peso 14520", etc.
    const match = line.match(/^(.*?)\s+([\d\.,]+)$/);
    if (match) {
      const rawTitle = match[1].trim();
      const rawAmount = match[2].replace(/\./g, '').replace(',', '.');
      const amount = parseFloat(rawAmount);

      if (!isNaN(amount)) {
        const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
        const { category, method, note } = inferCategoryAndMethod(rawTitle);

        expenses.push({
          id: `parsed-${Date.now()}-${i}`,
          title,
          amount,
          currency: 'ARS',
          category,
          method,
          date: todayStr,
          isConfirmed: true,
          source: 'KEEP_BATCH',
          ...(note ? { note } : {}),
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

  // 2. Frescos & Panadería (Carnicería, Verdulería, Fiambrería, Dietética, Panadería, Pastas)
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

  // 7. Resúmenes Tarjeta
  if (t.includes('tarjeta') || t.includes('visa') || t.includes('master') || t.includes('amex')) {
    return {
      category: 'Resúmenes Tarjeta',
      method: 'CREDITO',
      note: 'Resumen tarjeta de crédito',
    };
  }

  // 8. Default: Cuidado & Varios
  return {
    category: 'Cuidado & Varios',
    method: 'EFECTIVO',
  };
}
