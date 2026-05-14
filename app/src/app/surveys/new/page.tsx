'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { Label, Input, Select, Textarea, FormGroup, FormHint } from '@/components/Form';
import Alert from '@/components/Alert';

export default function NewSurveyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    form_provider: 'google_forms',
    form_url: '',
    max_reminders: 2,
    reminder_interval_days: 3,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'max_reminders' || name === 'reminder_interval_days' ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to create survey');
      }

      const survey = await res.json();
      router.push(`/surveys/${survey.id}/overview`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1>New Survey</h1>
          <p className="page-subtitle">Set up a new research survey campaign</p>
        </div>
      </div>

      <Card style={{ maxWidth: 680 }}>
        <CardContent>
          {error && <Alert variant="danger" className="mb-4" onClose={() => setError('')}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="title">Survey Title *</Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Q1 2026 Employee Satisfaction Survey"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional internal notes about this survey"
              />
            </FormGroup>

            <hr className="divider" />

            <div className="form-row">
              <FormGroup>
                <Label htmlFor="form_provider">Form Provider *</Label>
                <Select
                  id="form_provider"
                  name="form_provider"
                  value={form.form_provider}
                  onChange={handleChange}
                  required
                >
                  <option value="google_forms">Google Forms</option>
                  <option value="ms_forms">Microsoft Forms</option>
                  <option value="qualtrics">Qualtrics</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label htmlFor="form_url">Form URL *</Label>
                <Input
                  id="form_url"
                  name="form_url"
                  type="url"
                  value={form.form_url}
                  onChange={handleChange}
                  placeholder="https://forms.google.com/..."
                  required
                />
              </FormGroup>
            </div>

            <hr className="divider" />
            <h3 className="text-muted mb-4" style={{ fontWeight: 500, fontSize: 13 }}>
              REMINDER SETTINGS
            </h3>

            <div className="form-row">
              <FormGroup>
                <Label htmlFor="max_reminders">Max Reminders</Label>
                <Input
                  id="max_reminders"
                  name="max_reminders"
                  type="number"
                  min={0}
                  max={10}
                  value={form.max_reminders}
                  onChange={handleChange}
                />
                <FormHint>How many reminder emails to send per respondent</FormHint>
              </FormGroup>
              <FormGroup>
                <Label htmlFor="reminder_interval_days">Reminder Interval (days)</Label>
                <Input
                  id="reminder_interval_days"
                  name="reminder_interval_days"
                  type="number"
                  min={1}
                  max={30}
                  value={form.reminder_interval_days}
                  onChange={handleChange}
                />
                <FormHint>Days between reminder emails</FormHint>
              </FormGroup>
            </div>

            <div className="flex gap-4 mt-4">
              <Button type="submit" isLoading={loading}>
                {loading ? 'Creating...' : 'Create Survey'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
