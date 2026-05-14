import { z } from 'zod';

export const SurveySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  form_provider: z.enum(['google_forms', 'ms_forms', 'qualtrics']),
  form_url: z.string().url('Invalid form URL'),
  max_reminders: z.number().int().min(0).max(5).default(2),
  reminder_interval_days: z.number().int().min(1).max(30).default(3),
  metadata: z.record(z.any()).default({}),
});

export type SurveyInput = z.infer<typeof SurveySchema>;

export const RespondentSchema = z.object({
  survey_id: z.string().uuid(),
  email: z.string().email(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  metadata: z.record(z.any()).default({}),
});

export type RespondentInput = z.infer<typeof RespondentSchema>;

export const BrevoWebhookEventSchema = z.object({
  event: z.string(),
  email: z.string().email(),
  id: z.number().optional(),
  'message-id': z.string().optional(),
  MessageId: z.string().optional(),
  ts: z.number().optional(),
  'ts_event': z.number().optional(),
  subject: z.string().optional(),
  template_id: z.number().optional(),
  tags: z.array(z.string()).optional(),
  ip: z.string().optional(),
  from: z.string().optional(),
});

export const BrevoWebhookPayloadSchema = z.union([
  BrevoWebhookEventSchema,
  z.array(BrevoWebhookEventSchema),
]);
