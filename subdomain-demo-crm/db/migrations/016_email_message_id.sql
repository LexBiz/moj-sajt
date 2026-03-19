-- Migration 016: Add message_id to crm_job_emails for IMAP deduplication

ALTER TABLE crm_job_emails ADD COLUMN IF NOT EXISTS message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_emails_message_id
  ON crm_job_emails(message_id)
  WHERE message_id IS NOT NULL;
