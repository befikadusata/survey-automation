export type FormProvider = 'google_forms' | 'ms_forms' | 'qualtrics';

export type SurveyStatus = 'draft' | 'active' | 'closed';

export type RespondentStatus =
  | 'pending'
  | 'invited'
  | 'email_opened'
  | 'link_opened'
  | 'completed'
  | 'bounced'
  | 'unsubscribed';

export type EventType =
  | 'invited'
  | 'email_opened'
  | 'email_clicked'
  | 'link_opened'
  | 'completed'
  | 'bounced'
  | 'unsubscribed'
  | 'reminder_sent';

export interface Survey {
  id: string;
  title: string;
  description: string | null;
  form_provider: FormProvider;
  form_url: string;
  metadata: Record<string, string>;
  status: SurveyStatus;
  max_reminders: number;
  reminder_interval_days: number;
  created_at: string;
  closed_at: string | null;
}

export interface SurveyWithStats extends Survey {
  total: number;
  pending: number;
  invited: number;
  email_opened: number;
  link_opened: number;
  completed: number;
  bounced: number;
  unsubscribed: number;
}

export interface Respondent {
  id: string;
  survey_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  metadata: Record<string, unknown>;
  token: string;
  status: RespondentStatus;
  reminder_count: number;
  last_reminded_at: string | null;
  invited_at: string | null;
  completed_at: string | null;
  created_at: string;
  last_activity?: string | null;
}

export interface SurveyEvent {
  id: number;
  respondent_id: string;
  survey_id: string;
  event_type: EventType;
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
