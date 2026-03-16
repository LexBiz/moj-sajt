-- Migration 013: Completion act tokens and signing records

CREATE TABLE IF NOT EXISTS crm_completion_acts (
  id           SERIAL PRIMARY KEY,
  job_id       INTEGER REFERENCES crm_jobs(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  client_email TEXT,
  status       TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'signed' | 'expired'
  signer_name  TEXT,
  signed_at    TIMESTAMPTZ,
  signature_image_path TEXT,
  pdf_path     TEXT,
  pdf_url      TEXT,
  sent_at      TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_completion_acts_token ON crm_completion_acts(token);
CREATE INDEX IF NOT EXISTS idx_completion_acts_job_id ON crm_completion_acts(job_id);
