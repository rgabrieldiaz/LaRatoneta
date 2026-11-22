import { NextResponse } from 'next/server';
import { inferCategoryAndMethod } from '@/lib/keepParser';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Supports raw notification text or structured payload
    let title = body.title || body.text || 'Gasto Automático';
    let rawAmount = body.amount;
    let currency = body.currency || 'ARS';

    // If text was passed (e.g. from MacroDroid raw notification: "Pagaste $23.200 a Big Pons con QR")
    if (!rawAmount && typeof body.text === 'string') {
      const match = body.text.match(/\$([\d\.,]+)/);
      if (match) {
        rawAmount = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
      }
    }

    const amount = typeof rawAmount === 'number' ? rawAmount : parseFloat(rawAmount || '0');

    const { category, method } = inferCategoryAndMethod(title);

    const expense = {
      id: `webhook-${Date.now()}`,
      title,
      amount,
      currency,
      category,
      method: body.method || method,
      date: new Date().toISOString().split('T')[0],
      isConfirmed: false, // Arrives in pending queue for easy confirmation
      source: body.source || 'NOTIFICATION',
      note: body.note || 'Recibido vía Webhook',
    };

    return NextResponse.json({
      success: true,
      message: 'Gasto recibido con éxito en la bandeja de pendientes',
      expense,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar webhook' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/webhook',
    methods: ['POST'],
    description: 'Webhook para ingesta de gastos desde MacroDroid, Gmail y Telegram',
  });
}
