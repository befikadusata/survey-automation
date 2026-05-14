import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { ensureAuth } from '@/lib/auth-util';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { authenticated, response } = await ensureAuth();
  if (!authenticated) return response;

  try {
    const { id } = await params;

    const result = await query(`
      SELECT
        r.id, r.email, r.first_name, r.last_name, r.status,
        r.reminder_count, r.invited_at, r.completed_at, r.created_at,
        (SELECT MAX(e.created_at) FROM events e WHERE e.respondent_id = r.id) AS last_activity
      FROM respondents r
      WHERE r.survey_id = $1
      ORDER BY r.created_at DESC
    `, [id]);

    const headers = [
      'id', 'email', 'first_name', 'last_name', 'status',
      'reminder_count', 'invited_at', 'completed_at', 'created_at', 'last_activity'
    ];

    const csvLines = [headers.join(',')];
    for (const row of result.rows) {
      csvLines.push(
        headers.map(h => {
          const val = (row as Record<string, unknown>)[h];
          if (val == null) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      );
    }

    return new Response(csvLines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="respondents-${id}.csv"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/surveys/[id]/export]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
