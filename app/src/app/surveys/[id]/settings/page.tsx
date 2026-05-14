'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Survey } from '@/types';

export default function SettingsPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<Partial<Survey> & { metadata?: Record<string, string> }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/surveys/${params.id}`)
      .then(r => r.json())
      .then(data => { setForm(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('metadata.')) {
      const key = name.slice(9);
      setForm(prev => ({
        ...prev,
        metadata: { ...(prev.metadata || {}), [key]: value },
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [name]: name === 'max_reminders' || name === 'reminder_interval_days' ? parseInt(value, 10) : value,
      }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        form_url: form.form_url,
        status: form.status,
        max_reminders: form.max_reminders,
        reminder_interval_days: form.reminder_interval_days,
      };

      // If metadata has provider config, patch it via a separate endpoint or include it
      if (form.metadata && Object.keys(form.metadata).length > 0) {
        (payload as Record<string, unknown>).metadata = form.metadata;
      }

      const res = await fetch(`/api/surveys/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save');
      }

      const updated = await res.json();
      setForm(updated);
      setSuccess('Settings saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} /></div>;

  const providerSpecificFields = () => {
    const provider = form.form_provider;
    if (provider === 'google_forms') {
      return (
        <div className="form-group">
          <label className="form-label" htmlFor="metadata.sheet_id">Google Sheet ID</label>
          <input
            id="metadata.sheet_id"
            name="metadata.sheet_id"
            className="form-input"
            value={(form as Record<string, unknown>).metadata ? (form.metadata as Record<string, string>)['sheet_id'] || '' : ''}
            onChange={handleChange}
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
          />
          <span className="form-hint">The ID from the Google Sheet URL where responses are saved</span>
        </div>
      );
    }
    if (provider === 'ms_forms') {
      return (
        <div className="form-group">
          <label className="form-label" htmlFor="metadata.excel_id">Excel File ID</label>
          <input
            id="metadata.excel_id"
            name="metadata.excel_id"
            className="form-input"
            value={(form as Record<string, unknown>).metadata ? (form.metadata as Record<string, string>)['excel_id'] || '' : ''}
            onChange={handleChange}
            placeholder="e.g. 01KJEEN4P3W7VWXYZ..."
          />
          <span className="form-hint">The file ID from the Excel Online workbook</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ maxWidth: 680 }}>
      {success && <div className="alert alert-success" style={{ marginBottom: 20 }}>{success}</div>}
      {error && <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>}

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 20 }}>General</h3>

          <div className="form-group">
            <label className="form-label" htmlFor="title">Survey Title</label>
            <input id="title" name="title" className="form-input" value={form.title ?? ''} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Description</label>
            <textarea id="description" name="description" className="form-textarea" value={form.description ?? ''} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">Status</label>
            <select id="status" name="status" className="form-select" value={form.status ?? 'draft'} onChange={handleChange}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <span className="form-hint">Set to <strong>Active</strong> to allow reminder automation to run. <strong>Closed</strong> stops all outbound.</span>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 20 }}>Form Integration</h3>

          <div className="form-group">
            <label className="form-label" htmlFor="form_url">Form URL</label>
            <input id="form_url" name="form_url" className="form-input" type="url" value={form.form_url ?? ''} onChange={handleChange} required />
            <span className="form-hint">Base URL of the external form. Token is appended automatically for Google Forms and Qualtrics.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Form Provider</label>
            <div className="form-input" style={{ color: 'var(--text-secondary)', cursor: 'not-allowed' }}>
              {form.form_provider ?? '—'} (cannot be changed after creation)
            </div>
          </div>

          {providerSpecificFields()}
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 20 }}>Reminder Settings</h3>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="max_reminders">Max Reminders</label>
              <input id="max_reminders" name="max_reminders" className="form-input" type="number" min={0} max={10} value={form.max_reminders ?? 2} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reminder_interval_days">Interval (days)</label>
              <input id="reminder_interval_days" name="reminder_interval_days" className="form-input" type="number" min={1} max={30} value={form.reminder_interval_days ?? 3} onChange={handleChange} />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spinner" /> : null}
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
