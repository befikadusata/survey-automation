import { NextResponse } from 'next/server';
import { ensureAuth } from '@/lib/auth-util';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { authenticated, response } = await ensureAuth();
  if (!authenticated) return response;

  try {
    const { id } = await params;
    const n8nUrl = process.env.N8N_WEBHOOK_URL;

    const response = await fetch(`${n8nUrl}/webhook/send-reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ survey_id: id }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: 'n8n trigger failed', detail: text },
        { status: 502 }
      );
    }

    const data = await response.json().catch(() => ({}));
    return NextResponse.json({ ok: true, n8n: data });
  } catch (err) {
    console.error('[POST /api/surveys/[id]/remind]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
