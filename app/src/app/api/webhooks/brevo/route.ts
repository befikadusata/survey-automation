import { NextRequest } from 'next/server';
import { Api } from '@/lib/api-response';
import { rateLimitByIp } from '@/lib/rate-limit';
import { BrevoWebhookPayloadSchema } from '@/lib/schemas';
import { RespondentService } from '@/lib/services/respondent.service';

function validateSecret(request: Request): boolean {
  const secret = request.headers.get('x-webhook-secret');
  const expected = process.env.BREVO_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
  return !!secret && secret === expected;
}

const EVENT_MAP: Record<string, { event_type: string; new_status?: string }> = {
  hard_bounce: { event_type: 'bounced', new_status: 'bounced' },
  soft_bounce: { event_type: 'bounced', new_status: 'bounced' },
  unsubscribe: { event_type: 'unsubscribed', new_status: 'unsubscribed' },
  open: { event_type: 'email_opened', new_status: 'email_opened' },
  click: { event_type: 'email_clicked' },
};

export async function POST(request: NextRequest) {
  const rl = rateLimitByIp(request, 60, 60_000);
  if (!rl.allowed) {
    return Api.tooManyRequests('Too many requests', Math.ceil((rl.resetAt - Date.now()) / 1000));
  }

  if (!validateSecret(request)) {
    return Api.unauthorized();
  }

  try {
    const rawPayload = await request.json();
    const result = BrevoWebhookPayloadSchema.safeParse(rawPayload);

    if (!result.success) {
      return Api.error('Invalid payload', 400, 'INVALID_PAYLOAD', { issues: result.error.issues });
    }

    const events = Array.isArray(result.data) ? result.data : [result.data];

    for (const event of events) {
      const { event: eventType, email, MessageId, 'message-id': msgId } = event;
      const actualMessageId = MessageId || msgId;
      const dedupeKey = actualMessageId ? `brevo:${actualMessageId}` : null;

      if (dedupeKey && await RespondentService.eventExists(dedupeKey)) {
        continue;
      }

      const respondent = await RespondentService.findByEmailOrMessageId(email, actualMessageId);
      if (!respondent) continue;

      const mapping = EVENT_MAP[eventType];
      if (!mapping) continue;

      const metadata = { 
        brevo_event: eventType, 
        message_id: actualMessageId,
        raw: event 
      };

      await RespondentService.transitionStatus(
        respondent.id,
        mapping.new_status || '',
        mapping.event_type,
        'brevo',
        metadata,
        dedupeKey || undefined
      );
    }

    return Api.success({ processed: events.length });
  } catch (err) {
    return Api.serverError('Brevo webhook error', err);
  }
}
