-- Migration 015: Add client_comment field to crm_jobs for storing the initial inquiry comment
ALTER TABLE crm_jobs ADD COLUMN IF NOT EXISTS client_comment TEXT;

-- Backfill existing jobs with the comment from their linked leads
UPDATE crm_jobs j
SET client_comment = l.comment
FROM crm_leads l
WHERE j.lead_id = l.id
  AND l.comment IS NOT NULL
  AND l.comment <> ''
  AND j.client_comment IS NULL;
