import { Category, Currency, Expense, PaymentMethod } from './types';

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
        category: 'Tarjetas',
        method: 'CREDITO',
        date: todayStr,
        isConfirmed: true,
        source: 'KEEP_BATCH',
      });
      continue;
    }

    // Special case: "Tarjeta Amex 172"
    if (/amex\s*(\d+)/i.test(line)) {
      const m = line.match(/amex\s*(\d+)/i);
      const amount = m ? parseFloat(m[1]) : 0;
      expenses.push({
        id: `parsed-${Date.now()}-${i}`,
        title: 'Tarjeta Amex',
        amount,
        currency: 'USD',
        category: 'Tarjetas',
        method: 'CREDITO',
        date: todayStr,
        isConfirmed: true,
        source: 'KEEP_BATCH',
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
        const { category, method } = inferCategoryAndMethod(rawTitle);

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
        });
      }
    }
  }

  return expenses;
}

export function inferCategoryAndMethod(title: string): { category: Category; method: PaymentMethod } {
  const t = title.toLowerCase();

  // Supermercados (Chinos, Coto, Día, Carrefour, etc.)
  if (t.includes('chino') || t.includes('carrefour') || t.includes('coto') || t.includes('día') || t.includes('dia') || t.includes('supermercado')) {
    const isChino = t.includes('chino');
    return {
      category: 'Supermercados',
      method: isChino ? 'EFECTIVO' : 'DEBITO',
    };
  }

  // Carnicería, Verduras, Frescos
  if (t.includes('carniceria') || t.includes('carnicería') || t.includes('verduleria') || t.includes('verdulería') || t.includes('fiambreria') || t.includes('dietetica') || t.includes('dietética')) {
    const isVerdu = t.includes('verdu');
    return {
      category: 'Carnicería, Verdura & Frescos',
      method: isVerdu ? 'EFECTIVO' : 'MODO',
    };
  }

  // Panadería & Pastas
  if (t.includes('panaderia') || t.includes('panadería') || t.includes('pastas')) {
    return {
      category: 'Panadería & Pastas',
      method: 'EFECTIVO',
    };
  }

  // Comida & Salidas
  if (t.includes('comida') || t.includes('pizza') || t.includes('sandwich') || t.includes('sándwich') || t.includes('empanada') || t.includes('kfc') || t.includes('pons') || t.includes('restaurante') || t.includes('cafe') || t.includes('café') || t.includes('bar')) {
    const isCashFood = t.includes('al peso');
    return {
      category: 'Comida & Salidas',
      method: isCashFood ? 'EFECTIVO' : 'MERCADO_PAGO',
    };
  }

  // Hogar & Servicios
  if (t.includes('expensa') || t.includes('termo') || t.includes('personal') || t.includes('sindicato') || t.includes('luz') || t.includes('gas') || t.includes('agua') || t.includes('wifi') || t.includes('alquiler')) {
    return {
      category: 'Hogar & Servicios',
      method: 'TRANSFERENCIA',
    };
  }

  // Transporte
  if (t.includes('cabify') || t.includes('uber') || t.includes('taxi') || t.includes('didi')) {
    return {
      category: 'Transporte',
      method: 'MERCADO_PAGO',
    };
  }
  if (t.includes('sube') || t.includes('colectivo') || t.includes('tren') || t.includes('subte') || t.includes('transporte')) {
    return {
      category: 'Transporte',
      method: 'SUBE',
    };
  }

  // Salud & Farmacia
  if (t.includes('farmacia') || t.includes('hospital') || t.includes('britanico') || t.includes('británico') || t.includes('medico') || t.includes('suplemento') || t.includes('remedio')) {
    return {
      category: 'Salud & Farmacia',
      method: 'DEBITO',
    };
  }

  // Tarjetas
  if (t.includes('tarjeta') || t.includes('visa') || t.includes('master') || t.includes('amex')) {
    return {
      category: 'Tarjetas',
      method: 'CREDITO',
    };
  }

  // Default: Varios & Cuidado
  return {
    category: 'Varios & Cuidado',
    method: 'EFECTIVO',
  };
}
