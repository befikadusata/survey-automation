const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['invited', 'bounced', 'unsubscribed', 'completed'],
  invited: ['email_opened', 'link_opened', 'bounced', 'unsubscribed', 'completed'],
  email_opened: ['link_opened', 'bounced', 'unsubscribed', 'completed'],
  link_opened: ['completed', 'bounced', 'unsubscribed'],
  completed: [],
  bounced: [],
  unsubscribed: [],
};

const TERMINAL_STATUSES = new Set(['completed', 'bounced', 'unsubscribed']);

export function isValidTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export const SURVEY_VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['active'],
  active: ['closed'],
  closed: [],
};

export function isValidSurveyTransition(from: string, to: string): boolean {
  const allowed = SURVEY_VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
