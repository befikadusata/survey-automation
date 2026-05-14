# WORKFLOW: Respondent Redirect
**Version**: 0.1
**Date**: 2026-05-13
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Tracking respondent engagement

## Overview
This workflow is triggered when a respondent clicks their unique tracking link in an email. The system logs the engagement, updates the respondent's status, and redirects them to the actual survey form with their token appended.

## Actors
| Actor | Role in this workflow |
|---|---|
| Respondent | Clicks the link |
| Next.js App | Processes the redirect and logs events |
| PostgreSQL | Persists the status change |

## Prerequisites
- Respondent token must exist and be valid.
- Survey must be `active`.

## Trigger
- **Action**: GET `/r/:token`
- **Source**: Web Browser

## Workflow Tree

### STEP 1: Resolve Token
**Actor**: Next.js (Redirect Route)
**Action**: Query `respondents` and `surveys` by `token`.
**Output on SUCCESS**: Respondent and Survey objects -> GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(not_found)`: Token does not exist -> [Return 404]
  - `FAILURE(survey_closed)`: Survey status is `closed` -> [Return "Survey Closed" page]

### STEP 2: Log Engagement
**Actor**: Next.js (Database Transaction)
**Action**: 
  1. Insert into `events` (type: `link_opened`).
  2. Update `respondents.status = 'link_opened'` (only if current status allows it).
**Input**: `{ respondent_id, survey_id }`
**Output on SUCCESS**: State persisted -> GO TO STEP 3
**Output on FAILURE**: `FAILURE(db_error)` -> **GAP: Should we still redirect?** (Current: Log error and redirect anyway to not block user).

### STEP 3: Redirect to Form
**Actor**: Next.js
**Action**: 302 Redirect to `survey.form_url` with `token` appended as a query param.
**Example**: `https://forms.google.com/.../viewform?entry.12345={{token}}`

## State Transitions
`[invited]` | `[email_opened]` -> `[link_opened]`

## Handoff Contracts

### Browser -> Next.js
**URL**: `/r/{{token}}`
**Response**: 302 Redirect

## Reality Checker Findings
| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | Redirect happens even if DB update fails | Low | Step 2 | Documented as intended behavior to prioritize respondent experience. |
| RC-2 | No check for terminal statuses | Medium | Step 1 | If already `completed`, should we redirect? (Current: Yes, allows multiple views). |

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Valid Token | Active survey | `link_opened` logged, redirected to form |
| TC-02: Invalid Token | "abc123" | 404 Page |
| TC-03: Closed Survey | status='closed' | "Survey is now closed" page |
