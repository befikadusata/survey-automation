# API Reference

This document covers the public and internal API endpoints for the Survey Automation platform.

## 🔐 Authentication

- **Admin Routes**: Require a session cookie managed by NextAuth. Redirects to `/login` if unauthorized.
- **Webhook Routes**: Protected by a shared secret passed in the `X-Webhook-Secret` header.
- **Public Routes**: No authentication required (e.g., tracking redirects).

---

## 📋 Survey Management (Admin)

### List Surveys
`GET /api/surveys`
Returns a list of all survey campaigns.

### Create Survey
`POST /api/surveys`
Creates a new survey campaign.
**Payload:**
```json
{
  "title": "Employee Engagement 2026",
  "form_provider": "google_forms",
  "form_url": "https://docs.google.com/forms/d/...",
  "max_reminders": 3,
  "reminder_interval_days": 2,
  "metadata": {
    "sheet_id": "YOUR_GOOGLE_SHEET_ID"
  }
}
```

### Update Survey
`PATCH /api/surveys/[id]`
Updates survey configuration or status (`draft`, `active`, `closed`).

---

## 🔗 Tracking & Redirects

### Respondent Redirect
`GET /r/[token]`
Logs a `link_opened` event and redirects the respondent to the target form with the token appended.

---

## 🪝 Webhooks

### Brevo (Email Events)
`POST /api/webhooks/brevo`
Handles bounce, unsubscribe, and open events from Brevo.
**Security**: Verified via `BREVO_WEBHOOK_SECRET`.

### n8n (Automation Signals)
`POST /api/webhooks/n8n`
Internal endpoint for n8n to signal survey completions.
**Security**: Verified via `N8N_WEBHOOK_SECRET`.
**Payload:**
```json
{
  "token": "resp_unique_token",
  "source": "google_sheets",
  "event_type": "completed"
}
```

### Qualtrics (Real-time Completion)
`POST /api/webhooks/qualtrics`
Direct webhook from Qualtrics for immediate completion tracking.
**Security**: Verified via `QUALTRICS_WEBHOOK_SECRET`.

---

## 🏥 Health & Maintenance

### Health Check
`GET /api/health`
Returns `200 OK` if the database is reachable.
```json
{ "status": "ok", "db": "connected" }
```
