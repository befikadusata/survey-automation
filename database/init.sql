-- Users: dashboard administrators and viewers
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50) DEFAULT 'viewer', -- admin | viewer
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Surveys: one record per research survey campaign
CREATE TABLE surveys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    form_provider   VARCHAR(50) NOT NULL,   -- 'google_forms' | 'ms_forms' | 'qualtrics'
    form_url        TEXT NOT NULL,           -- base URL of the external form
    metadata        JSONB DEFAULT '{}',      -- provider-specific config: sheet_id, excel_id, field_id
    status          VARCHAR(50) DEFAULT 'draft', -- draft | active | closed
    max_reminders   INT DEFAULT 2,
    reminder_interval_days INT DEFAULT 3,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    closed_at       TIMESTAMPTZ
);

-- Respondents: one record per person per survey
CREATE TABLE respondents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    -- any extra columns from the uploaded CSV stored as JSON
    metadata        JSONB DEFAULT '{}',
    token           VARCHAR(64) UNIQUE NOT NULL,  -- used in tracking URL and form pre-fill
    status          VARCHAR(50) DEFAULT 'pending',
    -- pending | invited | email_opened | link_opened | completed | bounced | unsubscribed
    reminder_count  INT DEFAULT 0,
    last_reminded_at TIMESTAMPTZ,
    invited_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(survey_id, email)
);

-- Events: append-only log of every trackable action
CREATE TABLE events (
    id              BIGSERIAL PRIMARY KEY,
    respondent_id   UUID NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    event_type      VARCHAR(50) NOT NULL,
    -- invited | email_opened | email_clicked | link_opened | completed
    -- bounced | unsubscribed | reminder_sent
    source          VARCHAR(50),            -- brevo | n8n | app | qualtrics
    metadata        JSONB DEFAULT '{}',     -- raw webhook payload or extra context
    dedupe_key      VARCHAR(255),           -- provider event id for deduplication
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook Mappings: map Brevo MessageId to respondent for deterministic webhook resolution
CREATE TABLE webhook_mappings (
    id              BIGSERIAL PRIMARY KEY,
    message_id      VARCHAR(255) NOT NULL,
    respondent_id   UUID NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
    survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id)
);

-- Indexes
CREATE INDEX idx_respondents_survey_id   ON respondents(survey_id);
CREATE INDEX idx_respondents_token       ON respondents(token);
CREATE INDEX idx_respondents_status      ON respondents(status);
CREATE INDEX idx_respondents_email       ON respondents(email);
CREATE INDEX idx_events_respondent_id    ON events(respondent_id);
CREATE INDEX idx_events_survey_id        ON events(survey_id);
CREATE INDEX idx_events_event_type       ON events(event_type);
CREATE INDEX idx_events_created_at       ON events(created_at);
CREATE INDEX idx_events_dedupe_key       ON events(dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX idx_webhook_mappings_message_id ON webhook_mappings(message_id);
CREATE INDEX idx_webhook_mappings_respondent_id ON webhook_mappings(respondent_id);
CREATE INDEX idx_surveys_metadata        ON surveys USING gin(metadata);
