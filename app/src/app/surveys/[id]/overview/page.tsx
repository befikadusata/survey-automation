'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/Card';
import Alert from '@/components/Alert';
import StatCard from '@/components/StatCard';
import CompletionStack from '@/components/CompletionStack';
import { SurveyWithStats } from '@/types';

const SEGMENTS = [
  { key: 'completed',    color: '#10b981', label: 'Completed' },
  { key: 'link_opened', color: '#f59e0b', label: 'Opened Link' },
  { key: 'email_opened',color: '#8b5cf6', label: 'Opened Email' },
  { key: 'invited',     color: '#3b82f6', label: 'Invited' },
  { key: 'pending',     color: '#4d5670', label: 'Pending' },
  { key: 'bounced',     color: '#ef4444', label: 'Bounced' },
  { key: 'unsubscribed',color: '#6b7280', label: 'Unsubscribed' },
] as const;

export default function OverviewPage() {
  const params = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<SurveyWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [msg, setMsg] = useState('');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    const load = () => {
      fetch(`/api/surveys/${params.id}`)
        .then(r => r.json())
        .then(data => { setSurvey(data.data); setLoading(false); })
        .catch(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [params?.id]);

  const triggerSend = async () => {
    setSending(true); setMsg('');
    const res = await fetch(`/api/surveys/${params?.id}/send`, { method: 'POST' });
    setSending(false);
    setMsg(res.ok ? '✅ Invitation send triggered successfully.' : '❌ Failed to trigger send.');
  };

  const triggerRemind = async () => {
    setReminding(true); setMsg('');
    const res = await fetch(`/api/surveys/${params?.id}/remind`, { method: 'POST' });
    setReminding(false);
    setMsg(res.ok ? '✅ Reminder batch triggered successfully.' : '❌ Failed to trigger reminders.');
  };

  const changeStatus = async (newStatus: string) => {
    setChangingStatus(true); setMsg(''); setConfirmAction(null);
    const res = await fetch(`/api/surveys/${params?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    setChangingStatus(false);
    if (res.ok) {
      const updated = await res.json();
      setSurvey(prev => prev ? { ...prev, ...updated } : prev);
      setMsg(`✅ Survey status changed to "${newStatus}".`);
    } else {
      const data = await res.json();
      setMsg(`❌ ${data.error || 'Failed to change status.'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="stats-grid">
          {[1, 2, 3, 4, 5, 6].map(i => <StatCard key={i} label="" value={0} total={0} color="" loading />)}
        </div>
      </div>
    );
  }

  if (!survey) return <Alert variant="danger">Survey not found.</Alert>;

  const total = survey.total;
  const noReply = survey.invited + survey.email_opened;

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center gap-4 mb-6">
        <StatusBadge status={survey.status} />
        <span className="text-muted text-sm">·</span>
        <span className="text-muted text-sm">
          Created {new Date(survey.created_at).toLocaleDateString()}
        </span>
        <div className="flex gap-2 ml-auto">
          {survey.status === 'draft' && (
            <Button
              variant="secondary"
              size="sm"
              style={{ borderColor: 'var(--status-completed)' }}
              onClick={() => setConfirmAction('active')}
              isLoading={changingStatus}
            >
              Publish → Active
            </Button>
          )}
          {survey.status === 'active' && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmAction('closed')}
              isLoading={changingStatus}
            >
              Close Survey
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={triggerRemind}
            disabled={survey.status !== 'active'}
            isLoading={reminding}
            leftIcon={<span>🔔</span>}
          >
            Send Reminders
          </Button>
          <Button
            size="sm"
            onClick={triggerSend}
            disabled={survey.status === 'closed'}
            isLoading={sending}
            leftIcon={<span>📨</span>}
          >
            Send Invitations
          </Button>
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <Card className="mb-4" style={{ borderColor: 'var(--warning)' }}>
          <CardContent className="flex items-center justify-between">
            <div>
              {confirmAction === 'active'
                ? 'Are you sure you want to publish this survey? Invitations and reminders can be sent once active.'
                : 'Are you sure you want to close this survey? No further invitations or reminders will be sent.'}
            </div>
            <div className="flex gap-2 ml-4">
              <Button variant="secondary" size="sm" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => changeStatus(confirmAction)}
                isLoading={changingStatus}
              >
                Confirm
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {msg && (
        <Alert
          variant={msg.startsWith('✅') ? 'success' : 'danger'}
          className="mb-4"
          onClose={() => setMsg('')}
        >
          {msg}
        </Alert>
      )}

      {/* Stacked completion bar */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Completion Overview</CardTitle>
            <span className="text-muted text-sm">
              {total.toLocaleString()} respondents total
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <CompletionStack
            total={total}
            data={survey as unknown as Record<string, number>}
            segments={SEGMENTS}
          />
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="stats-grid">
        <StatCard label="Invited"   value={survey.invited + survey.email_opened + survey.link_opened + survey.completed + survey.bounced + survey.unsubscribed} total={total} color="var(--status-invited)" />
        <StatCard label="Opened Email" value={survey.email_opened} total={total} color="var(--status-email-opened)" />
        <StatCard label="Opened Link"  value={survey.link_opened}  total={total} color="var(--status-link-opened)" />
        <StatCard label="Completed" value={survey.completed}   total={total} color="var(--status-completed)" />
        <StatCard label="No Reply"  value={noReply}            total={total} color="var(--text-muted)" />
        <StatCard label="Bounced"   value={survey.bounced}     total={total} color="var(--status-bounced)" />
      </div>

      {/* Config summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Survey Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid-3 text-sm">
            <div>
              <div className="stat-label mb-4">Form Provider</div>
              <div className="font-bold capitalize">{survey.form_provider.replace('_', ' ')}</div>
            </div>
            <div>
              <div className="stat-label mb-4">Max Reminders</div>
              <div className="font-bold">{survey.max_reminders}</div>
            </div>
            <div>
              <div className="stat-label mb-4">Reminder Interval</div>
              <div className="font-bold">{survey.reminder_interval_days} days</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="stat-label mb-4">Form URL</div>
            <a href={survey.form_url} target="_blank" rel="noreferrer" className="text-sm break-all">
              {survey.form_url}
            </a>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
