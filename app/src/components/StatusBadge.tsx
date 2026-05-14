import { RespondentStatus, SurveyStatus } from '@/types';

const STATUS_LABELS: Record<RespondentStatus | SurveyStatus, string> = {
  pending: 'Pending',
  invited: 'Invited',
  email_opened: 'Email Opened',
  link_opened: 'Link Opened',
  completed: 'Completed',
  bounced: 'Bounced',
  unsubscribed: 'Unsubscribed',
  draft: 'Draft',
  active: 'Active',
  closed: 'Closed',
};

export default function StatusBadge({ status }: { status: RespondentStatus | SurveyStatus }) {
  return (
    <span className={`badge badge-${status.replace('_', '_')} border border-current border-opacity-20`}>
      <span className="badge-dot" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
