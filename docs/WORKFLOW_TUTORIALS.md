# Workflow Tutorials

The platform uses n8n to handle complex automation logic. All workflows are stored in the `/n8n-workflows` directory.

## 📥 Importing Workflows

1.  Access your n8n instance at `https://yourdomain.com/n8n/`.
2.  Go to **Workflows** → **Add Workflow** → **Import from File**.
3.  Select one of the `.json` files from the `/n8n-workflows` directory.

---

## 📧 Workflow 1: Send Invitations
**File**: `1-send-invitations.json`

**Purpose**: triggered when an admin clicks "Send Invitations" in the dashboard.
- Fetches all respondents with `pending` status.
- Sends bulk emails via Brevo using your invitation template.
- Records the Brevo `messageId` in `webhook_mappings` for tracking.
- Updates respondent status to `invited`.

**Configuration**:
- Ensure you have a **Brevo API** credential set up in n8n.
- Set `BREVO_INVITATION_TEMPLATE_ID` in your environment.

---

## ⏰ Workflow 2: Daily Reminders
**File**: `2-daily-reminders.json`

**Purpose**: Runs daily at 08:00 (Cron) to follow up with non-respondents.
- Filters respondents who are `invited` but haven't `completed`.
- Respects `max_reminders` and `reminder_interval_days`.
- Sends reminder emails via Brevo.

**Configuration**:
- Set `BREVO_REMINDER_TEMPLATE_ID` in your environment.

---

## 📊 Workflow 3: Google Forms Poller
**File**: `3-google-forms-poller.json`

**Purpose**: Polls a Google Sheet every 5 minutes to detect completions.
- Queries active Google Forms surveys.
- Matches tokens in the spreadsheet with the database.
- Calls the `/api/webhooks/n8n` endpoint to mark respondents as `completed`.

**Configuration**:
- Set up **Google Sheets OAuth2** credentials in n8n.
- Ensure your Google Sheet has a column named `token`.

---

## 📁 Workflow 4: MS Forms Poller
**File**: `4-ms-forms-poller.json`

**Purpose**: Polls an Excel file in OneDrive/SharePoint every 5 minutes.
- Similar to the Google Forms poller but for Microsoft Excel.
- Uses the respondent's email as the primary lookup.

**Configuration**:
- Set up **Microsoft Excel OAuth2** credentials in n8n.
