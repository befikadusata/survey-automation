import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { Respondent } from '@/types';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(200, parseInt(searchParams.get('limit') ?? '50', 10));
    const offset = (page - 1) * limit;

    const conditions = ['r.survey_id = $1'];
    const values: unknown[] = [id];

    if (status && status !== 'all') {
      conditions.push(`r.status = $${values.length + 1}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(r.email ILIKE $${values.length + 1} OR r.first_name ILIKE $${values.length + 1} OR r.last_name ILIKE $${values.length + 1})`);
      values.push(`%${search}%`);
    }

    const where = conditions.join(' AND ');

    const [respondents, countResult] = await Promise.all([
      query<Respondent & { last_activity: string | null }>(`
        SELECT r.*,
          (SELECT MAX(e.created_at) FROM events e WHERE e.respondent_id = r.id) AS last_activity
        FROM respondents r
        WHERE ${where}
        ORDER BY r.created_at DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `, [...values, limit, offset]),
      query<{ count: string }>(`SELECT COUNT(*)::text FROM respondents r WHERE ${where}`, values),
    ]);

    return NextResponse.json({
      data: respondents.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      page,
      limit,
    });
  } catch (err) {
    console.error('[GET /api/surveys/[id]/respondents]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { authenticated, response } = await ensureAuth();
  if (!authenticated) return response;

  try {
    const { id: surveyId } = await params;

    // Verify survey exists
    const surveyCheck = await query('SELECT id FROM surveys WHERE id = $1', [surveyId]);
    if (!surveyCheck.rows[0]) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const columnMapRaw = formData.get('columnMap') as string | null;

    if (!file) return NextResponse.json({ error: 'file is required' }, { status: 400 });

    const csvText = await file.text();
    const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return NextResponse.json({ error: 'CSV parse error', details: errors.slice(0, 5) }, { status: 400 });
    }

    // columnMap: { csvHeader: 'email' | 'first_name' | 'last_name' | 'metadata_key' }
    const columnMap: Record<string, string> = columnMapRaw ? JSON.parse(columnMapRaw) : {};

    const reservedFields = new Set(['email', 'first_name', 'last_name']);
    let inserted = 0;
    let skipped = 0;

    for (const row of data) {
      // Resolve mapped column names
      const resolved: Record<string, string> = {};
      for (const [csvCol, mappedField] of Object.entries(columnMap)) {
        if (row[csvCol] !== undefined) resolved[mappedField] = row[csvCol];
      }
      // Auto-detect if no columnMap provided
      if (Object.keys(columnMap).length === 0) {
        for (const [k, v] of Object.entries(row)) {
          resolved[k.toLowerCase().trim()] = v;
        }
      }

      const email = resolved['email']?.trim().toLowerCase();
      if (!email) { skipped++; continue; }

      const firstName = resolved['first_name'] ?? null;
      const lastName = resolved['last_name'] ?? null;
      const metadata: Record<string, string> = {};
      for (const [k, v] of Object.entries(resolved)) {
        if (!reservedFields.has(k)) metadata[k] = v;
      }

      const token = uuidv4().replace(/-/g, '');

      try {
        await query(
          `INSERT INTO respondents (survey_id, email, first_name, last_name, metadata, token)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (survey_id, email) DO NOTHING`,
          [surveyId, email, firstName, lastName, JSON.stringify(metadata), token]
        );
        inserted++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({ inserted, skipped, total: data.length }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/surveys/[id]/respondents]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
rnal server error' }, { status: 500 });
  }
}
