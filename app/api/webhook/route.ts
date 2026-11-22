import { NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import { inferCategoryAndMethod, parseRawKeepText } from '@/lib/keepParser';
import { fetchDolarMepRate } from '@/lib/dolarApi';
import { checkRateLimit } from '@/lib/rateLimit';
import { Expense, PaymentMethod } from '@/lib/types';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

const LEDGER_ID = 'primary';

function parseAmountValue(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return 0;

  let cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return 0;

  // Handle Argentine format "23.200,50" vs US/Apple Pay format "23200.50" or "23,200.50"
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Comma is decimal separator (e.g. "23.200,50")
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Dot could be decimal (e.g. "23200.50") or thousands (e.g. "23.200")
    const afterDot = cleaned.slice(lastDot + 1);
    if (afterDot.length === 3 && lastComma === -1) {
      cleaned = cleaned.replace(/\./g, '');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

function mapCardToMethod(cardName?: string, fallbackMethod: PaymentMethod = 'CREDITO'): PaymentMethod {
  if (!cardName) return fallbackMethod;
  const c = cardName.toLowerCase();

  const prepaidOrDebitKeywords = [
    'ripio',
    'personal',
    'mercado',
    'mp',
    'debito',
    'débito',
    'uala',
    'ualá',
    'lemon',
    'belo',
    'brubank',
    'prex',
    'cuenta',
  ];

  if (prepaidOrDebitKeywords.some((k) => c.includes(k))) {
    return 'CUENTA';
  }
  return 'CREDITO';
}

function formatMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'EFECTIVO':
      return 'Efectivo';
    case 'CUENTA':
      return 'En Cuenta';
    case 'CREDITO':
      return 'Crédito';
    case 'SUBE':
      return 'SUBE';
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // 0. General IP Rate Limit (30 requests / minute)
    const generalLimit = checkRateLimit(`webhook:${ip}`, 30, 60_000);
    if (!generalLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          notification: '⏳ Demasiadas peticiones. Esperá unos segundos.',
          error: 'Too many requests',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(generalLimit.retryAfterSec) },
        }
      );
    }

    const body = await request.json();

    // 1. Validate Webhook Secret
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          notification: '⚠️ Falta configurar WEBHOOK_SECRET en Vercel',
          error: 'WEBHOOK_SECRET not configured on server',
        },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
    const providedSecret =
      request.headers.get('x-webhook-secret') || bearerSecret || body.secret;

    if (!providedSecret || providedSecret !== expectedSecret) {
      // Strict brute-force protection: max 5 invalid secret attempts per 5 minutes
      const authFailLimit = checkRateLimit(`webhook_auth_fail:${ip}`, 5, 5 * 60_000);
      if (!authFailLimit.allowed) {
        return NextResponse.json(
          {
            success: false,
            notification: '🚫 Demasiados intentos fallidos. Esperá 5 minutos.',
            error: 'Too many failed authentication attempts',
          },
          {
            status: 429,
            headers: { 'Retry-After': String(authFailLimit.retryAfterSec) },
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          notification: '🔒 Clave secreta incorrecta en el Atajo',
          error: 'Unauthorized: invalid webhook secret',
        },
        { status: 401 }
      );
    }

    // 2. Initialize Firebase Admin Firestore
    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json(
        {
          success: false,
          notification: '⚠️ Falta configurar FIREBASE_SERVICE_ACCOUNT_KEY en Vercel',
          error: 'Firebase Admin not configured on server',
        },
        { status: 500 }
      );
    }

    // Determine Argentina local date (UTC-3)
    const nowAR = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const todayStr = nowAR.toISOString().split('T')[0];
    const yesterdayAR = new Date(nowAR.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterdayAR.toISOString().split('T')[0];

    let newExpense: Expense | null = null;

    // 3A. Natural Voice / Siri payload ({ text: "chino 4500 pesos en efectivo" })
    if (typeof body.text === 'string' && body.text.trim() && !body.merchant && !body.amount) {
      const mentionsUSD = /\b(?:u\$s|usd|d[oó]lares?|dol)\b/i.test(body.text);
      const mepRate = mentionsUSD ? await fetchDolarMepRate() : undefined;
      const parsed = parseRawKeepText(body.text, mepRate);

      if (parsed.length === 0) {
        return NextResponse.json(
          {
            success: false,
            notification: '🤔 No entendí el monto. Probá: "Chino 4500 efectivo"',
            error: 'Could not parse amount/title from text',
          },
          { status: 400 }
        );
      }

      const first = parsed[0];
      const siriTag = '🎙️ Siri';
      newExpense = {
        ...first,
        id: `siri-${Date.now()}`,
        date: todayStr,
        isConfirmed: true,
        source: 'NOTIFICATION',
        note: first.note ? `${siriTag} • ${first.note}` : siriTag,
      };
    } else {
      // 3B. Structured Apple Pay / Wallet payload ({ merchant, amount, card })
      const rawTitle = (body.merchant || body.title || 'Compra Apple Pay').toString().trim();
      const amount = parseAmountValue(body.amount);

      if (!amount || amount <= 0) {
        return NextResponse.json(
          {
            success: false,
            notification: '⚠️ No se recibió un monto válido desde Apple Pay',
            error: 'Invalid or missing amount',
          },
          { status: 400 }
        );
      }

      const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
      const inferred = inferCategoryAndMethod(title);
      const cardName = body.card ? body.card.toString().trim() : undefined;
      const finalMethod: PaymentMethod = body.method || mapCardToMethod(cardName, inferred.method);
      const walletNote = cardName ? `📲 Apple Pay (${cardName})` : '📲 Apple Pay';

      newExpense = {
        id: `applepay-${Date.now()}`,
        title,
        amount,
        currency: 'ARS',
        category: body.category || inferred.category,
        method: finalMethod,
        date: todayStr,
        isConfirmed: true,
        source: 'NOTIFICATION',
        note: body.note || walletNote,
      };
    }

    // 4. 24-hour Anti-Duplicate Shield
    const expensesCol = db.collection('users').doc(LEDGER_ID).collection('expenses');
    const recentSnap = await expensesCol.where('date', '>=', yesterdayStr).get();

    const duplicateDoc = recentSnap.docs.find((docSnap) => {
      const data = docSnap.data();
      return (
        data.currency === 'ARS' &&
        Math.abs(Number(data.amount) - newExpense!.amount) < 1
      );
    });

    if (duplicateDoc) {
      const existing = duplicateDoc.data();
      return NextResponse.json({
        success: true,
        duplicate: true,
        notification: `⚠️ Ya estaba anotado: ${existing.title} — $${Number(existing.amount).toLocaleString('es-AR')} (no se duplicó)`,
        expense: existing,
      });
    }

    // 5. Persist directly to Firestore (Option A)
    await expensesCol.doc(newExpense.id).set(newExpense);

    const formattedAmount = newExpense.amount.toLocaleString('es-AR');
    const notification = `🧀 Anotado: ${newExpense.title} — $${formattedAmount} (${newExpense.category} • ${formatMethodLabel(newExpense.method)})`;

    return NextResponse.json({
      success: true,
      duplicate: false,
      notification,
      expense: newExpense,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        notification: '❌ Error al guardar en La Ratoneta',
        error: error.message || 'Error al procesar webhook',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const isDbReady = Boolean(getAdminFirestore());
  const isSecretReady = Boolean(process.env.WEBHOOK_SECRET);

  return NextResponse.json({
    status: 'online',
    endpoint: '/api/webhook',
    configured: isDbReady && isSecretReady,
    firestoreAdmin: isDbReady,
    webhookSecret: isSecretReady,
    description: 'Webhook Fase 1 para Apple Pay y Siri (iOS Shortcuts)',
  });
}
