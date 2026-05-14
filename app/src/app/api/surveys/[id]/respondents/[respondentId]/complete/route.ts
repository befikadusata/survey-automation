import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isValidTransition, isTerminal } from '@/lib/transitions';
import { logger } from '@/lib/log';
import { ensureAuth } from '@/lib/auth-util';

type Params = { params: Promise<{ id: string; respondentId: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { authenticated, session, response } = await ensureAuth();
  if (!authenticated) return response;

  try {
    const { id: surveyId, respondentId } = await params;

    const result = await query(
      `SELECT id, survey_id, status FROM respondents WHERE id = $1 AND survey_id = $2 LIMIT 1`,
      [respondentId, surveyId]
    );
    const respondent = result.rows[0];

    if (!respondent) {
      return NextResponse.json({ error: 'Respondent not found' }, { status: 404 });
    }

    if (isTerminal(respondent.status)) {
      return NextResponse.json(
        { error: `Cannot complete respondent with terminal status '${respondent.status}'` },
        { status: 409 }
      );
    }

    if (!isValidTransition(respondent.status, 'completed')) {
      return NextResponse.json(
        { error: `Invalid transition from '${respondent.status}' to 'completed'` },
        { status: 409 }
      );
    }

    await query('BEGIN');

    await query(
      `UPDATE respondents SET status = 'completed', completed_at = NOW() WHERE id = $1`,
      [respondent.id]
    );

    await query(
      `INSERT INTO events (respondent_id, survey_id, event_type, source, metadata)
       VALUES ($1, $2, 'completed', 'app_manual', $3)`,
      [respondent.id, respondent.survey_id, JSON.stringify({ completed_by: session.user?.name })]
    );

    await query('COMMIT');

    logger.info('Manual mark complete', {
      route: 'POST /api/surveys/[id]/respondents/[respondentId]/complete',
      survey_id: surveyId,
      respondent_id: respondentId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    logger.error('Manual complete failed', {
      route: 'POST /api/surveys/[id]/respondents/[respondentId]/complete',
      error: (err as Error).message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
