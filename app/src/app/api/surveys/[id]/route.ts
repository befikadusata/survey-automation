import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Api } from '@/lib/api-response';
import { ensureAuth } from '@/lib/auth-util';
import { isValidSurveyTransition } from '@/lib/transitions';
import { logger } from '@/lib/log';
import { SurveyWithStats } from '@/types';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { authenticated, response: authResponse } = await ensureAuth();
    if (!authenticated) return authResponse;

    const { id } = await params;
    const result = await query<SurveyWithStats>(`
      SELECT
        s.*,
        COUNT(r.id)::int                                             AS total,
        COUNT(r.id) FILTER (WHERE r.status = 'pending')::int         AS pending,
        COUNT(r.id) FILTER (WHERE r.status = 'invited')::int         AS invited,
        COUNT(r.id) FILTER (WHERE r.status = 'email_opened')::int    AS email_opened,
        COUNT(r.id) FILTER (WHERE r.status = 'link_opened')::int     AS link_opened,
        COUNT(r.id) FILTER (WHERE r.status = 'completed')::int       AS completed,
        COUNT(r.id) FILTER (WHERE r.status = 'bounced')::int         AS bounced,
        COUNT(r.id) FILTER (WHERE r.status = 'unsubscribed')::int    AS unsubscribed
      FROM surveys s
      LEFT JOIN respondents r ON r.survey_id = s.id
      WHERE s.id = $1
      GROUP BY s.id
    `, [id]);

    if (!result.rows[0]) {
      return Api.error('Survey not found', 404);
    }
    return Api.success(result.rows[0]);
  } catch (err) {
    logger.error('Get survey failed', {
      route: 'GET /api/surveys/[id]',
      error: (err as Error).message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { authenticated, response } = await ensureAuth();
  if (!authenticated) return response;

  try {
    const { id } = await params;
    const body = await request.json();
    const allowed = ['title', 'description', 'form_url', 'status', 'max_reminders', 'reminder_interval_days', 'metadata'];
    const fields: string[] = [];
    const values: unknown[] = [];

    // Validate status transitions
    if (body.status) {
      const current = await query(`SELECT status FROM surveys WHERE id = $1`, [id]);
      if (!current.rows[0]) {
        return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
      }
      if (!isValidSurveyTransition(current.rows[0].status, body.status)) {
        return NextResponse.json(
          { error: `Invalid status transition from '${current.rows[0].status}' to '${body.status}'` },
          { status: 409 }
        );
      }
      if (body.status === 'closed') {
        fields.push(`closed_at = NOW()`);
      }
    }

    for (const key of allowed) {
      if (key === 'metadata') {
        if (body.metadata && typeof body.metadata === 'object') {
          fields.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${values.length + 1}`);
          values.push(JSON.stringify(body.metadata));
        }
      } else if (key !== 'status' && key in body) {
        fields.push(`${key} = $${values.length + 1}`);
        values.push(body[key]);
      }
    }

    if (fields.length === 0 && !body.status) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(id);
    const result = await query(
      `UPDATE surveys SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    logger.error('Patch survey failed', {
      route: 'PATCH /api/surveys/[id]',
      error: (err as Error).message,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
