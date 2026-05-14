'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Survey } from '@/types';

const TABS = [
  { label: 'Overview',    path: 'overview' },
  { label: 'Respondents', path: 'respondents' },
  { label: 'Upload CSV',  path: 'upload' },
  { label: 'Settings',    path: 'settings' },
];

export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const [survey, setSurvey] = useState<Survey | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/surveys/${params.id}`)
      .then(r => r.json())
      .then(data => setSurvey(data))
      .catch(() => {});
  }, [params?.id]);

  return (
    <>
      {/* Survey breadcrumb header */}
      <div style={{ marginBottom: 4 }}>
        <Link href="/surveys" style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          All Surveys
        </Link>
      </div>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div className="page-header-left">
          <h1 style={{ fontSize: '1.25rem' }}>{survey?.title ?? '...'}</h1>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="subnav" style={{ marginTop: 16 }}>
        {TABS.map(tab => {
          const href = `/surveys/${params?.id}/${tab.path}`;
          const isActive = pathname === href;
          return (
            <Link key={tab.path} href={href} className={`subnav-link ${isActive ? 'active' : ''}`}>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </>
  );
}
