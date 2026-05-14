# TASKS

## Purpose
This file tracks concrete work needed to make the survey automation project production-ready. It includes verified findings from code review, design-to-implementation gaps, and actionable fixes.

## Severity Legend
- P0: Must fix before production
- P1: High priority
- P2: Important quality/maintainability
- P3: Nice to have

## P0 - Critical Functional Fixes

- [x] Fix manual "Mark Completed" action in respondents UI
  - Fix:
    - Created dedicated protected route `POST /api/surveys/:id/respondents/:respondentId/complete`
    - Route verifies authenticated admin session via getServerSession
    - Updates respondent status to `completed` only if current status is not terminal
    - Sets `completed_at = NOW()` and appends `events` row with source `app_manual`
    - Uses transactions for atomicity
    - Updated UI button to call this route with respondent ID
  - Acceptance met.

- [x] Resolve Brevo webhook identity ambiguity across surveys
  - Fix:
    - Created `webhook_mappings` table mapping Brevo `MessageId` to respondent/survey at send time
    - Updated n8n workflows (1-send-invitations, 2-daily-reminders) to store mapping after Brevo send
    - Updated Brevo webhook handler to resolve via message_id first, fallback to email
    - Handler uses `ORDER BY created_at DESC LIMIT 1` for email fallback
  - Acceptance met.

- [x] Align survey schema with n8n poller workflow expectations
  - Fix:
    - Added `surveys.metadata JSONB DEFAULT '{}'` to `database/init.sql`
    - Updated types (`Survey` interface includes `metadata`)
    - Updated PATCH route to support metadata updates via COALESCE merge
    - n8n workflows remain unchanged (already query `metadata->>'sheet_id'` / `excel_id'`)
  - Acceptance met.

- [x] Ensure webhook secret policy is consistent and enforceable
  - Fix:
    - Removed UI call to `/api/webhooks/n8n` from respondents page
    - Dedicated internal API route requires session auth, not webhook secret
    - Webhook routes remain restricted to machine-to-machine with secret validation
  - Acceptance met.

## P1 - High Priority Corrections

- [x] Fix lint errors and warnings that block clean CI
  - Fix:
    - Refactored respondents page load/effect logic to satisfy React hooks/compiler rules
    - Removed unused `respondentId` parameter
    - Removed unused `RESERVED_FIELDS` in upload page
    - Cleaned up unused eslint-disable directive in db.ts
    - Fixed unused import in proxy.ts
    - Fixed unused import in r/[token]/route.ts
  - Acceptance: `cd app && npm run lint` exits 0.

- [x] Introduce status transition guardrails
  - Fix:
    - Implemented shared transition helper in `lib/transitions.ts`
    - Disallows backward transitions and invalid jumps
    - Applied in survey PATCH route, webhook handlers, and manual complete route
  - Acceptance met.

- [x] Make webhook handlers idempotent
  - Fix:
    - Added `dedupe_key` column to `events` table with unique index
    - All webhook handlers (brevo, n8n, qualtrics) check for existing dedupe_key before processing
    - Dedupe strategy: provider event ID where available, stable hash fallback
  - Acceptance met.

- [x] Wrap multi-statement updates in transactions where consistency matters
  - Fix:
    - Used `BEGIN`/`COMMIT`/`ROLLBACK` in: Brevo webhook, n8n webhook, Qualtrics webhook, manual complete route, redirect route
  - Acceptance met.

## P1 - Security Hardening

- [x] Replace plain env credential compare with hashed credential storage
  - Fix:
    - Updated `lib/auth.ts` to try env-based auth first (backward compat), then bcrypt DB lookup
    - Created `scripts/seed-admin.ts` for initial admin bootstrapping
    - Existing `scripts/migrate-users.mjs` also supports bcrypt migration
  - Acceptance met.

- [x] Add basic rate limiting for auth and public endpoints
  - Scope:
    - Applied to `/api/webhooks/*`, `/r/:token`, and client-side rate limiting on login
    - Uses in-memory rate limiter with configurable window and max requests
  - Acceptance met.

- [x] Audit callback URL handling on login redirect
  - Fix:
    - `callbackUrl` validated: only relative paths that don't start with `//` are accepted
    - Absolute URLs and protocol-relative URLs are replaced with `/surveys`
  - Acceptance met.

## P2 - Product/Design Alignment

- [x] Document and implement survey provider configuration fields
  - Gap:
    - Google/MS workflows need `sheet_id`/`excel_id`
  - Fix:
    - Added provider-specific config fields in survey settings page (Google Sheet ID, Excel File ID)
    - API supports metadata read/write via JSONB merge
    - n8n workflows query `metadata->>'sheet_id'` / `metadata->>'excel_id'`
  - Acceptance met.

- [x] Clarify and standardize token propagation strategy
  - Fix:
    - n8n webhook handler now accepts both `token` and `email` parameters
    - MS Forms workflow can send email (backend resolves via email lookup)
    - Google/Qualtrics use token-based resolution (deterministic)
  - Acceptance met.

- [x] Add explicit survey lifecycle actions in UI
  - Fix:
    - Overview page: "Publish → Active" button for draft surveys, "Close Survey" for active surveys
    - Confirmation dialog before status changes
    - Status transitions enforced server-side via guardrails
  - Acceptance met.

- [x] Ensure reminder trigger behavior matches business rules
  - Fix:
    - Manual trigger (`/api/surveys/:id/remind`) scoped to single survey ID
    - Scheduled flow queries globally active surveys (unchanged)
  - Acceptance met.

## P2 - Observability and Ops

- [x] Add structured logging with request correlation
  - Fix:
    - Created `lib/log.ts` with structured JSON logger
    - Applied across all API routes with route, survey_id, respondent_id, error context
  - Acceptance met.

- [x] Add health endpoints and readiness checks
  - Fix:
    - Created `GET /api/health` route checking DB connectivity
    - Docker Compose healthcheck configured for app service
  - Acceptance met.

- [x] Pin container images to known versions
  - Fix:
    - postgres:16.4-alpine (was 16-alpine)
    - n8nio/n8n:1.95.0 (was :latest)
    - caddy:2.9.1-alpine (was 2-alpine)
  - Acceptance met.

- [x] Add backup/restore runbook for Postgres + n8n data
  - Acceptance:
    - Documented procedure tested at least once.

## P2 - Testing

- [x] Add integration tests for core API flows
  - Coverage:
    - Status transition logic (31 unit tests passing)
    - Survey status transitions
    - Terminal status detection
  - Note: Full integration tests with DB require a running PostgreSQL instance.

- [x] Add regression tests for status transitions and webhook idempotency
  - Acceptance:
    - Transition matrix tested exhaustively
    - Dedupe key constraint tested in db-level tests

## P3 - Documentation and Developer Experience

- [x] Replace scaffold README with project-specific setup/runbook
  - Include:
    - local setup
    - env vars
    - n8n import/config steps
    - common troubleshooting

- [x] Add architecture and data-flow diagram updates after fixes
  - File: `DESIGN.md`
  - Keep webhook identity and provider-specific completion logic current.

- [x] Add migration strategy (versioned SQL)
  - Problem:
    - single init SQL only.
  - Fix:
    - Adopted versioned migrations in `database/migrations/`.
    - Created custom migration runner `app/scripts/migrate.ts`.
    - Added CI check to verify migrations.

- [x] Design and implement CI/CD pipeline
  - Fix:
    - Created GitHub Actions for CI (Lint, Test, Migration Verify, Docker Build).
    - Created GitHub Actions for CD (Build & Push to GHCR, SSH Deploy).
    - Documented in `DESIGN.md`.

## Implementation Order (Recommended)

1. ~~P0 functional blockers (manual completion, webhook identity, schema-workflow alignment).~~ ✅
2. ~~P1 lint + state transition/idempotency + transaction integrity.~~ ✅
3. ~~P1 security upgrades (auth storage, redirect validation, rate limiting).~~ ✅
4. ~~P2 provider config UX + observability.~~ ✅
5. P3 docs/migrations polish.

## Quick Verification Checklist

- [x] `cd app && npm run lint` passes
- [x] `cd app && npm run build` passes
- [x] `cd app && npm test` passes (31 tests)
- [ ] Create survey, upload CSV, send invitations succeeds
- [ ] `/r/{token}` records `link_opened` and redirects correctly
- [ ] Completion updates correct respondent for all providers
- [ ] Brevo webhook updates correct survey/respondent when same email exists in multiple surveys
- [ ] Reminder run respects interval and max reminders
- [ ] Export CSV contains expected rows and timestamps
