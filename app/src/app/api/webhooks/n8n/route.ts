import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isValidTransition, isTerminal } from '@/lib/transitions';
import { logger } from '@/lib/log';
import { rateLimitByIp } from '@/lib/rate-limit';

function validateSecret(request: Request): boolean {
  const secret = request.headers.get('x-webhook-secret');
  const expected = process.env.N8N_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
  return !!secret && secret === expected;
}

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } });
  }

  if (!validateSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const { token, email, event_type, source } = payload;

    if (!token && !email) {
      return NextResponse.json({ error: 'token or email required' }, { status: 400 });
    }

    const dedupeKey = `n8n:${token || email}:${event_type || 'completed'}`;
    const existing = await query(
      `SELECT id FROM events WHERE dedupe_key = $1 LIMIT 1`, [dedupeKey]
    );
    if (existing.rows[0]) {
      return NextResponse.json({ ok: true, deduplicated: true });
    }

    let respondent;
    if (token) {
      const result = await query(
        `SELECT id, survey_id, status FROM respondents WHERE token = $1 LIMIT 1`,
        [token]
      );
      respondent = result.rows[0];
    }

    if (!respondent && email) {
      const result = await query(
        `SELECT id, survey_id, status FROM respondents WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
        [email?.toLowerCase()]
      );
      respondent = result.rows[0];
    }

    if (!respondent) {
      return NextResponse.json({ error: 'Respondent not found' }, { status: 404 });
    }

    if (isTerminal(respondent.status) && respondent.status === 'completed') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await query('BEGIN');

    if (!isTerminal(respondent.status) && isValidTransition(respondent.status, 'completed')) {
      await query(
        `UPDATE respondents SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [respondent.id]
      );
    }

    await query(
      `INSERT INTO events (respondent_id, survey_id, event_type, source, metadata, dedupe_key)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [respondent.id, respondent.survey_id, event_type ?? 'completed', source ?? 'n8n', JSON.stringify(payload), dedupeKey]
    );

    await query('COMMIT');

    return NextResponse.json({ ok: true });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    logger.error('n8n webhook error', {
      route: 'POST /api/webhooks/n8n',
      error: (err as Error).message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
