import { query, withTransaction } from '@/lib/db';
import { isValidTransition } from '@/lib/transitions';
import { logger } from '@/lib/log';

export interface Respondent {
  id: string;
  survey_id: string;
  email: string;
  status: string;
  first_name?: string;
  last_name?: string;
  metadata: Record<string, unknown>;
}

export class RespondentService {
  /**
   * Finds a respondent by email and messageId (deterministic mapping)
   */
  static async findByEmailOrMessageId(email: string, messageId?: string): Promise<Respondent | null> {
    if (messageId) {
      const mappingResult = await query(
        `SELECT respondent_id FROM webhook_mappings WHERE message_id = $1 LIMIT 1`,
        [messageId]
      );
      if (mappingResult.rows[0]) {
        return this.findById(mappingResult.rows[0].respondent_id);
      }
    }

    const result = await query(
      `SELECT * FROM respondents WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase()]
    );
    return (result.rows[0] as Respondent) || null;
  }

  static async findById(id: string): Promise<Respondent | null> {
    const result = await query(`SELECT * FROM respondents WHERE id = $1`, [id]);
    return (result.rows[0] as Respondent) || null;
  }

  /**
   * Transitions a respondent to a new status and logs the event
   */
  static async transitionStatus(
    respondentId: string,
    newStatus: string,
    eventType: string,
    source: string,
    metadata: Record<string, unknown> = {},
    dedupeKey?: string
  ): Promise<boolean> {
    return withTransaction(async (client) => {
      // 1. Get current respondent state
      const res = await client.query('SELECT survey_id, status FROM respondents WHERE id = $1 FOR UPDATE', [respondentId]);
      if (res.rowCount === 0) return false;
      
      const { survey_id, status: currentStatus } = res.rows[0];

      // 2. Validate transition if status is changing
      const isStatusChanging = newStatus && newStatus !== currentStatus;
      if (isStatusChanging && !isValidTransition(currentStatus, newStatus)) {
        logger.warn('Invalid respondent status transition attempted', {
          respondent_id: respondentId,
          from: currentStatus,
          to: newStatus,
        });
        return false;
      }

      // 3. Update status if valid
      if (isStatusChanging) {
        await client.query(
          'UPDATE respondents SET status = $1 WHERE id = $2',
          [newStatus, respondentId]
        );
      }

      // 4. Log event
      await client.query(
        `INSERT INTO events (respondent_id, survey_id, event_type, source, metadata, dedupe_key)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [respondentId, survey_id, eventType, source, JSON.stringify(metadata), dedupeKey]
      );

      return true;
    });
  }

  /**
   * Check if an event with the given dedupe key already exists
   */
  static async eventExists(dedupeKey: string): Promise<boolean> {
    const result = await query('SELECT 1 FROM events WHERE dedupe_key = $1 LIMIT 1', [dedupeKey]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}
