import { query } from '@/lib/db';
import { logger } from '@/lib/log';
import { rateLimitByIp } from '@/lib/rate-limit';

type Params = { params: Promise<{ token: string }> };

function buildFormUrl(baseUrl: string, provider: string, token: string): string {
  const url = new URL(baseUrl);
  if (provider === 'google_forms') {
    url.searchParams.set('entry.FIELD_ID', token);
  } else if (provider === 'qualtrics') {
    url.searchParams.set('token', token);
  }
  return url.toString();
}

export async function GET(req: Request, { params }: Params) {
  const rl = rateLimitByIp(req, 30, 60_000);
  if (!rl.allowed) {
    return new Response('Too many requests', { status: 429 });
  }

  try {
    const { token } = await params;

    const result = await query(`
      SELECT r.id, r.survey_id, r.status, r.email, s.form_url, s.form_provider
      FROM respondents r
      JOIN surveys s ON s.id = r.survey_id
      WHERE r.token = $1
      LIMIT 1
    `, [token]);

    const respondent = result.rows[0];

    if (!respondent) {
      return new Response('Link not found', { status: 404 });
    }

    await query('BEGIN');

    await query(
      `INSERT INTO events (respondent_id, survey_id, event_type, source)
       VALUES ($1, $2, 'link_opened', 'app')`,
      [respondent.id, respondent.survey_id]
    );

    if (['pending', 'invited', 'email_opened'].includes(respondent.status)) {
      await query(
        `UPDATE respondents SET status = 'link_opened' WHERE id = $1`,
        [respondent.id]
      );
    }

    await query('COMMIT');

    const formUrl = buildFormUrl(respondent.form_url, respondent.form_provider, token);
    // Only redirect to same-origin or valid form URLs
    try {
      new URL(formUrl);
    } catch {
      return new Response('Invalid form URL', { status: 500 });
    }
    return Response.redirect(formUrl, 302);
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    logger.error('Redirect error', {
      route: 'GET /r/[token]',
      error: (err as Error).message,
    });
    return new Response('Internal server error', { status: 500 });
  }
}
