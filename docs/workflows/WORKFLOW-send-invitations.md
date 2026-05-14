# WORKFLOW: Send Invitations
**Version**: 0.1
**Date**: 2026-05-13
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Survey distribution initialization

## Overview
This workflow is triggered when an admin clicks "Send Invitations" in the dashboard. It fetches all `pending` respondents for a survey, sends a templated email via Brevo, maps the Brevo `messageId` for future identity resolution, and marks the respondent as `invited`.

## Actors
| Actor | Role in this workflow |
|---|---|
| Admin | Triggers the workflow via Dashboard UI |
| App API | Receives trigger, authenticates, and calls n8n Webhook |
| n8n | Orchestrates the batch processing |
| PostgreSQL | Provides respondent data and stores status updates |
| Brevo | Sends the actual emails |

## Prerequisites
- Survey status must be `active`.
- Respondents must be in `pending` status.
- Brevo API credentials and template ID must be configured in environment variables.

## Trigger
- **Action**: POST `/api/surveys/:id/send`
- **Source**: Next.js App

## Workflow Tree

### STEP 1: Fetch Pending Respondents
**Actor**: n8n (Postgres Node)
**Action**: Query database for respondents where `survey_id = $1` and `status = 'pending'`.
**Timeout**: 30s
**Output on SUCCESS**: List of respondent objects -> GO TO STEP 2
**Output on FAILURE**: Empty list -> FINISH (No work to do)

### STEP 2: Batch Processing
**Actor**: n8n (Split In Batches)
**Action**: Split respondent list into batches of 500 for serial processing.
**Output**: Single respondent context -> GO TO STEP 3

### STEP 3: Send Email via Brevo
**Actor**: n8n (Brevo Node)
**Action**: Call `sendTemplate` with respondent email and survey metadata.
**Timeout**: 10s
**Input**: `{ email, first_name, token, survey_title }`
**Output on SUCCESS**: `{ messageId }` -> GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(api_error)`: Brevo returns error (e.g., invalid email, rate limit) -> **GAP: No Error Handling**
  - `FAILURE(timeout)`: Brevo does not respond -> **GAP: No Error Handling**

### STEP 4: Store Webhook Mapping
**Actor**: n8n (Postgres Node)
**Action**: Insert `messageId`, `respondent_id`, `survey_id`, and `email` into `webhook_mappings`.
**Input**: `{ messageId, id, survey_id, email }`
**Output on SUCCESS**: Row inserted -> GO TO STEP 5
**Output on FAILURE**: `FAILURE(db_error)` -> **GAP: No Error Handling**

### STEP 5: Update Respondent Status
**Actor**: n8n (Postgres Node)
**Action**: Update `respondents.status = 'invited'` and log `invited` event.
**Input**: `{ id, survey_id }`
**Output on SUCCESS**: Row updated -> GO TO STEP 2 (Next in batch)
**Output on FAILURE**: `FAILURE(db_error)` -> **GAP: No Error Handling**

## State Transitions
`[pending]` -> (step 3-5 succeed) -> `[invited]`

## Handoff Contracts

### App API -> n8n Webhook
**Endpoint**: `POST /send-invitations`
**Payload**: `{ "survey_id": "uuid" }`
**Success Response**: `{ "ok": true, "sent": count }`
**Timeout**: 60s (n8n responds after fetching pending, but before finishing batch)

### n8n -> Brevo API
**Operation**: `sendTemplate`
**Payload**: Template ID + recipient details + params
**Success Response**: `{ "messageId": "string" }`
**Timeout**: 10s

## Cleanup Inventory
None (Workflow is additive).

## Reality Checker Findings (Gap Analysis)
| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | No error handling if Brevo fails | High | Step 3 | Add `Error Trigger` or `Conditional Branch` in n8n |
| RC-2 | Status update happens even if Brevo fails | High | Step 5 | Ensure status only updates on Brevo success |
| RC-3 | No notification to admin if batch fails | Medium | Overview | Add Slack/Email alert on workflow failure |

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy Path | 10 pending respondents | 10 emails sent, 10 status updates, 10 mappings stored |
| TC-02: Empty Survey | 0 pending respondents | Webhook responds with 0 sent, no errors |
| TC-03: Brevo API Down | Brevo returns 500 | **RECOVERY NEEDED**: Do not update status, log error |
