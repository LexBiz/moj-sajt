-- Migration 012: Email correspondence log per job

CREATE TABLE IF NOT EXISTS crm_job_emails (
  id           SERIAL PRIMARY KEY,
  job_id       INTEGER REFERENCES crm_jobs(id) ON DELETE CASCADE,
  lead_id      INTEGER REFERENCES crm_leads(id) ON DELETE SET NULL,
  direction    TEXT NOT NULL DEFAULT 'outbound', -- 'outbound' | 'inbound'
  subject      TEXT,
  from_addr    TEXT,
  to_addr      TEXT,
  body         TEXT,
  html_body    TEXT,
  sent_at      TIMESTAMPTZ DEFAULT now(),
  resend_id    TEXT,
  status       TEXT DEFAULT 'sent', -- 'sent' | 'failed' | 'bounced' | 'opened'
  raw_payload  JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_emails_job_id ON crm_job_emails(job_id);
CREATE INDEX IF NOT EXISTS idx_job_emails_lead_id ON crm_job_emails(lead_id);
CREATE INDEX IF NOT EXISTS idx_job_emails_sent_at ON crm_job_emails(sent_at DESC);
