'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/Button';
import { Card } from '@/components/Card';
import Alert from '@/components/Alert';
import Skeleton from '@/components/Skeleton';
import { SurveyWithStats } from '@/types';

function SurveyRow({ survey }: { survey: SurveyWithStats }) {
  const completionPct = survey.total > 0
    ? Math.round((survey.completed / survey.total) * 100)
    : 0;

  const providerLabels: Record<string, string> = {
    google_forms: 'Google Forms',
    ms_forms: 'MS Forms',
    qualtrics: 'Qualtrics',
  };

  return (
    <tr>
      <td>
        <Link
          href={`/surveys/${survey.id}/overview`}
          className="font-bold text-primary-hover"
          style={{ color: 'var(--text-primary)' }}
        >
          {survey.title}
        </Link>
        <div className="text-sm text-muted mt-2">
          {providerLabels[survey.form_provider] ?? survey.form_provider}
        </div>
      </td>
      <td><StatusBadge status={survey.status} /></td>
      <td className="text-right">{survey.total.toLocaleString()}</td>
      <td className="text-right">
        <span style={{ color: 'var(--status-completed)', fontWeight: 600 }}>
          {survey.completed.toLocaleString()}
        </span>
        <span className="text-muted ml-4">({completionPct}%)</span>
      </td>
      <td className="text-right">
        <span style={{ color: 'var(--status-bounced)' }}>{survey.bounced.toLocaleString()}</span>
      </td>
      <td className="text-muted text-sm">
        {new Date(survey.created_at).toLocaleDateString()}
      </td>
      <td>
        <Button
          variant="secondary"
          size="sm"
          asChild
        >
          <Link href={`/surveys/${survey.id}/overview`}>View</Link>
        </Button>
      </td>
    </tr>
  );
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<SurveyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/surveys')
      .then(r => r.json())
      .then(data => { setSurveys(data.data); setLoading(false); })
      .catch(() => { setError('Failed to load surveys'); setLoading(false); });
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Surveys</h1>
          <p className="page-subtitle">Manage your research survey campaigns</p>
        </div>
        <div className="page-header-actions">
          <Button asChild leftIcon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          }>
            <Link href="/surveys/new">New Survey</Link>
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Card>
          <div className="flex flex-col gap-4">
            <Skeleton height={40} />
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        </Card>
      ) : surveys.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No surveys yet</h3>
          <p>Create your first survey to get started</p>
          <Button asChild className="mt-4">
            <Link href="/surveys/new">Create Survey</Link>
          </Button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Survey</th>
                <th>Status</th>
                <th className="text-right">Respondents</th>
                <th className="text-right">Completed</th>
                <th className="text-right">Bounced</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map(s => <SurveyRow key={s.id} survey={s} />)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
