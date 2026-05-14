import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { SurveyInput } from '@/lib/schemas';

export interface Survey {
  id: string;
  title: string;
  description?: string;
  form_provider: string;
  form_url: string;
  metadata: Record<string, unknown>;
  status: string;
  max_reminders: number;
  reminder_interval_days: number;
  created_at: Date;
}

export class SurveyService {
  static async getAllWithStats() {
    const result = await query(`
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
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    return result.rows;
  }

  static async create(input: SurveyInput) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO surveys (id, title, description, form_provider, form_url, max_reminders, reminder_interval_days, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        input.title,
        input.description ?? null,
        input.form_provider,
        input.form_url,
        input.max_reminders,
        input.reminder_interval_days,
        JSON.stringify(input.metadata)
      ]
    );
    return result.rows[0];
  }

  static async findById(id: string): Promise<Survey | null> {
    const result = await query(`SELECT * FROM surveys WHERE id = $1`, [id]);
    return (result.rows[0] as Survey) || null;
  }
}
