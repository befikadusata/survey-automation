# Survey Management System — MVP Design

## 1. Overview

A self-hosted web application for managing research survey distribution at scale (1,000–10,000 respondents). The system handles respondent list management, unique link generation, email delivery, status tracking, and reminder automation. It does **not** host questionnaires — it redirects respondents to Google Forms, MS Forms, or Qualtrics.

### Core Principles

- Everything runs in Docker on a single Hetzner VPS
- No paid middleware (no Power Automate, no Google Apps Script)
- n8n owns all automation logic; the app owns tracking endpoints
- PostgreSQL is the single source of truth for all state

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Hetzner VPS                              │
│                   (Docker Compose stack)                        │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │   Next.js    │   │     n8n      │   │   PostgreSQL     │   │
│  │  Dashboard   │   │  Automation  │   │   (port 5432)    │   │
│  │  + API Routes│   │  (port 5678) │   │                  │   │
│  │  (port 3000) │   │              │   │                  │   │
│  └──────┬───────┘   └──────┬───────┘   └──────────────────┘   │
│         │                  │                    ▲               │
│         └──────────────────┴────────────────────┘               │
│                                                                 │
│  ┌──────────────┐                                               │
│  │    Caddy     │  (Reverse proxy + auto TLS)                  │
│  │  (port 80/443│                                               │
│  └──────┬───────┘                                               │
└─────────┼───────────────────────────────────────────────────────┘
          │
    yourdomain.com
          │
    ┌─────┴──────┐
    │   Brevo    │  (Email delivery, bounce/open/click webhooks)
    └────────────┘
```

### Traffic Flows

```
Admin
  → uploads CSV via dashboard
  → Next.js API parses, stores respondents in PostgreSQL
  → n8n picks up new survey job, calls Brevo API to send bulk emails

Respondent
  → clicks link in email
  → hits yourdomain.com/r/{token}         ← Next.js API route
  → event logged to PostgreSQL (link_opened)
  → 302 redirect to form URL (with token embedded)

Completion (Google Forms)
  → response saved to Google Sheet (native)
  → n8n polls Google Sheet every 5 min
  → matches token column → updates PostgreSQL (completed)

Completion (Qualtrics)
  → Qualtrics POSTs webhook to yourdomain.com/api/webhooks/qualtrics
  → Next.js API route extracts token → updates PostgreSQL (completed)

Completion (MS Forms)
  → response saved to Excel Online (native)
  → n8n polls Excel via Microsoft Graph API every 5 min
  → matches email or token → updates PostgreSQL (completed)

Brevo webhooks
  → POST to yourdomain.com/api/webhooks/brevo
  → Next.js API route resolves respondent via webhook_mappings or email
  → Updates PostgreSQL (bounced / unsubscribed / email_opened)
```

---

## 3. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Dashboard & API | Next.js 15 (App Router) | API routes handle tracking redirects and webhooks; bcrypt auth; structured logging |
| Automation | n8n (self-hosted) | Handles bulk email sending, polling, reminder scheduling; uses webhook_mappings for identity |
| Database | PostgreSQL 16 | Relational integrity; JSONB for flexible provider config; Gin indexes for performance |
| Email Delivery | Brevo (API + SMTP) | Bulk sending, bounce/unsubscribe handling, open/click tracking |
| Reverse Proxy | Caddy | Auto TLS via Let's Encrypt, zero config |

---

## 4. Database Schema

```sql
-- Users: dashboard administrators
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50) DEFAULT 'viewer',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Surveys: one record per campaign
CREATE TABLE surveys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    form_provider   VARCHAR(50) NOT NULL,
    form_url        TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',      -- Provider config: sheet_id, excel_id
    status          VARCHAR(50) DEFAULT 'draft',
    max_reminders   INT DEFAULT 2,
    reminder_interval_days INT DEFAULT 3,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    closed_at       TIMESTAMPTZ
);

-- Respondents
CREATE TABLE respondents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    metadata        JSONB DEFAULT '{}',
    token           VARCHAR(64) UNIQUE NOT NULL,
    status          VARCHAR(50) DEFAULT 'pending',
    reminder_count  INT DEFAULT 0,
    last_reminded_at TIMESTAMPTZ,
    invited_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(survey_id, email)
);

-- Events: append-only log
CREATE TABLE events (
    id              BIGSERIAL PRIMARY KEY,
    respondent_id   UUID NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    event_type      VARCHAR(50) NOT NULL,
    source          VARCHAR(50),
    metadata        JSONB DEFAULT '{}',
    dedupe_key      VARCHAR(255),           -- Idempotency key
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Mappings: deterministic identity resolution
CREATE TABLE webhook_mappings (
    id              BIGSERIAL PRIMARY KEY,
    message_id      VARCHAR(255) UNIQUE NOT NULL,
    respondent_id   UUID NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Status State Machine
Status transitions are strictly enforced via `lib/transitions.ts`:
- **Respondents**: `pending` → `invited` → `email_opened` → `link_opened` → `completed`
- **Terminal States**: `completed`, `bounced`, `unsubscribed`
- **Surveys**: `draft` → `active` → `closed`

---

## 5. Security & Reliability

- **Idempotency**: All webhook handlers use `dedupe_key` (e.g., `brevo:msg_id`) to prevent duplicate events.
- **Transactions**: Multi-statement updates (e.g., status update + event log) are wrapped in `BEGIN/COMMIT`.
- **Identity Resolution**: `webhook_mappings` ensures Brevo events are mapped to the correct survey instance even if the same email exists in multiple active surveys.
- **Rate Limiting**: Public and webhook endpoints are protected by in-memory rate limiters.
- **Auth**: NextAuth with bcrypt hashed credentials.

---

## 6. n8n Workflows

### Workflow 1 — Send Invitations
1. Webhook trigger from App.
2. Query `pending` respondents.
3. Call Brevo API.
4. **Insert into `webhook_mappings`** with `message_id` from Brevo response.
5. Update respondent status to `invited`.

### Workflow 2 — Daily Reminders
1. Cron trigger.
2. Query eligible respondents (not terminal, due for reminder).
3. Send email and **Insert into `webhook_mappings`**.
4. Increment `reminder_count`.

... (Rest of workflows as previously defined)

---

## 7. CI/CD & Operations

### Continuous Integration (GitHub Actions)
- **Linting**: ESLint ensures code quality.
- **Testing**: Vitest runs unit and integration tests.
- **Migration Verification**: CI spawns a temporary PostgreSQL instance to verify that all migration scripts in `database/migrations/` apply cleanly.
- **Docker Verification**: Verifies that the production Docker image builds successfully.

### Continuous Deployment (GitHub Actions)
- **Build & Push**: On every merge to `main`, a new Docker image is built and pushed to **GitHub Container Registry (GHCR)**.
- **Automated Deployment**:
    1. SSH into the production VPS.
    2. Pull latest code changes.
    3. `docker login` to GHCR.
    4. `docker compose pull` the latest images.
    5. `docker compose up -d` to restart services.
    6. Run database migrations via `npm run migrate`.

### Migration Strategy
- Versioned SQL files stored in `database/migrations/`.
- Simple custom runner (`app/scripts/migrate.ts`) tracks applied migrations in a `_migrations` table.
- **Rule**: Never modify an existing migration file; always create a new one.

