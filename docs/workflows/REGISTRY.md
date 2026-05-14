# Workflow Registry — Survey Automation

## Workflows

| Workflow | Spec file | Status | Trigger | Primary actor | Last reviewed |
|---|---|---|---|---|---|
| Send Invitations | WORKFLOW-send-invitations.md | Draft | POST /api/surveys/:id/send | n8n | 2026-05-13 |
| Daily Reminders | WORKFLOW-daily-reminders.md | Draft | Cron (08:00) | n8n | 2026-05-13 |
| Google Forms Completion | WORKFLOW-google-poller.md | Draft | Schedule (5m) | n8n | 2026-05-13 |
| MS Forms Completion | WORKFLOW-ms-poller.md | Draft | Schedule (5m) | n8n | 2026-05-13 |
| Respondent Redirect | WORKFLOW-redirect.md | Draft | GET /r/:token | Next.js | 2026-05-13 |
| Qualtrics Completion | WORKFLOW-qualtrics-webhook.md | Draft | POST /api/webhooks/qualtrics | Next.js | 2026-05-13 |
| Brevo Event Processing | WORKFLOW-brevo-webhook.md | Draft | POST /api/webhooks/brevo | Next.js | 2026-05-13 |
| Manual Completion | WORKFLOW-manual-complete.md | Approved | UI Action | Next.js | 2026-05-13 |

## Components

| Component | File(s) | Workflows it participates in |
|---|---|---|
| Next.js API | app/src/app/api/ | All (Trigger or Webhook) |
| n8n Worker | n8n-workflows/ | Invitations, Reminders, Polling |
| Brevo | External | Invitations, Reminders, Event Processing |
| PostgreSQL | database/ | All (State Persistence) |

## State Map

### Respondent Status
| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| pending | CSV Upload | -> invited, completed, bounced, unsubscribed | Send Invitations, Manual Complete |
| invited | Send Invitations | -> email_opened, link_opened, completed, bounced, unsubscribed | Brevo Webhook, Redirect, Poller, Manual |
| email_opened | Brevo Webhook | -> link_opened, completed, bounced, unsubscribed | Redirect, Poller, Manual |
| link_opened | Redirect | -> completed, bounced, unsubscribed | Poller, Manual |
| completed | Poller / Webhook / Manual | (terminal) | — |
| bounced | Brevo Webhook | (terminal) | — |
| unsubscribed | Brevo Webhook | (terminal) | — |

### Survey Status
| State | Entered by | Exited by | Workflows that can trigger exit |
|---|---|---|---|
| draft | Creation | -> active | Admin Publish |
| active | Admin Publish | -> closed | Admin Close |
| closed | Admin Close | (terminal) | — |
