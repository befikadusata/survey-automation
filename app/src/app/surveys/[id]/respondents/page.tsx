'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import Button from '@/components/Button';
import { Card } from '@/components/Card';
import Alert from '@/components/Alert';
import Skeleton from '@/components/Skeleton';
import { Respondent, RespondentStatus } from '@/types';

const STATUS_FILTERS = [
  'all', 'pending', 'invited', 'email_opened', 'link_opened',
  'completed', 'bounced', 'unsubscribed',
] as const;

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function RespondentsPage() {
  const params = useParams<{ id: string }>();
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const limit = 50;

  useEffect(() => {
    if (!params?.id) return;
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(search ? { search } : {}),
    });
    fetch(`/api/surveys/${params.id}/respondents?${qs}`)
      .then(r => r.json())
      .then(data => { setRespondents(data.data); setTotal(data.total); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params?.id, page, statusFilter, search, refreshKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = () => {
    window.open(`/api/surveys/${params?.id}/export`, '_blank');
  };

  const markCompleted = async (respondentId: string) => {
    const res = await fetch(`/api/surveys/${params?.id}/respondents/${respondentId}/complete`, {
      method: 'POST',
    });
    if (res.ok) {
      setRefreshKey(k => k + 1);
      setLoading(true);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const goToPage = (p: number) => {
    setPage(p);
    setLoading(true);
  };

  const changeFilter = (s: string) => {
    setStatusFilter(s);
    setPage(1);
    setLoading(true);
  };

  return (
    <>
      <div className="filter-bar">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            className="search-input"
            placeholder="Search by email or name…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="sm">Search</Button>
        </form>

        <div className="filter-tabs ml-1">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              className={`filter-tab ${statusFilter === s ? 'active' : ''}`}
              onClick={() => changeFilter(s)}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setRefreshKey(k => k + 1); setLoading(true); }}>↻ Refresh</Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>⬇ Export CSV</Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <div className="flex flex-col gap-4">
            <Skeleton height={40} />
            <Skeleton height={60} />
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        </Card>
      ) : respondents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <h3>No respondents found</h3>
          <p>Upload a CSV to add respondents to this survey</p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Invited</th>
                  <th>Last Activity</th>
                  <th className="text-center">Reminders</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {respondents.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">
                      {[r.first_name, r.last_name].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="table-email">{r.email}</td>
                    <td><StatusBadge status={r.status as RespondentStatus} /></td>
                    <td className="table-mono">{formatDate(r.invited_at)}</td>
                    <td className="table-mono">{formatDate((r as Respondent & { last_activity?: string }).last_activity ?? null)}</td>
                    <td className="text-center text-muted">{r.reminder_count}</td>
                    <td>
                      {r.status !== 'completed' && r.status !== 'bounced' && r.status !== 'unsubscribed' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => markCompleted(r.id)}
                          title="Mark as completed"
                        >
                          ✓ Complete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span className="pagination-info">
              {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()} respondents
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => goToPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              ← Prev
            </Button>
            <span className="text-sm text-muted">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => goToPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Next →
            </Button>
          </div>
        </>
      )}
    </>
  );
}
