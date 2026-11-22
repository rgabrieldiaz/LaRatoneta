const FALLBACK_DOLAR_MEP = 1743;

/**
 * Fetches the current Dólar MEP (Bolsa) selling rate from dolarapi.com.
 * Falls back safely if offline or API is unreachable.
 */
export async function fetchDolarMepRate(): Promise<number> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/bolsa', {
      cache: 'no-store',
    });
    if (!res.ok) return FALLBACK_DOLAR_MEP;
    const data = await res.json();
    const rate = Number(data?.venta || data?.compra);
    return !isNaN(rate) && rate > 100 ? rate : FALLBACK_DOLAR_MEP;
  } catch {
    return FALLBACK_DOLAR_MEP;
  }
}

export { FALLBACK_DOLAR_MEP };
