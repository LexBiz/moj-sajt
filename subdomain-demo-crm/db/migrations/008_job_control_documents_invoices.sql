ALTER TABLE crm_jobs
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_client_contact_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_internal_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stalled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stalled_reason TEXT;

UPDATE crm_jobs
SET pipeline_stage = COALESCE(pipeline_stage, stage)
WHERE pipeline_stage IS NULL;

UPDATE crm_jobs
SET pipeline_stage = 'schvaleni_objednavka'
WHERE pipeline_stage = 'schvaleni';

CREATE INDEX IF NOT EXISTS idx_crm_jobs_pipeline_stage ON crm_jobs(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_next_action_due_at ON crm_jobs(next_action_due_at);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_stalled_at ON crm_jobs(stalled_at);

ALTER TABLE crm_job_documents
  ADD COLUMN IF NOT EXISTS document_type TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'created',
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS storage_key TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uploaded_by TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS signature_mode TEXT,
  ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE crm_job_documents
SET document_type = COALESCE(document_type, doc_type)
WHERE document_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_job_documents_status ON crm_job_documents(status);
CREATE INDEX IF NOT EXISTS idx_crm_job_documents_document_type ON crm_job_documents(document_type);

ALTER TABLE crm_job_events
  ADD COLUMN IF NOT EXISTS event_code TEXT,
  ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS actor_id TEXT,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE crm_job_events
SET message = COALESCE(message, description),
    metadata = COALESCE(metadata, '{}'::jsonb)
WHERE message IS NULL OR metadata IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_job_events_event_code ON crm_job_events(event_code);
CREATE INDEX IF NOT EXISTS idx_crm_job_events_actor_type ON crm_job_events(actor_type);

ALTER TABLE crm_job_tasks
  ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_crm_job_tasks_task_type ON crm_job_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_crm_job_tasks_priority ON crm_job_tasks(priority);

CREATE TABLE IF NOT EXISTS crm_job_invoices (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES crm_jobs(id) ON DELETE CASCADE,
  invoice_type TEXT NOT NULL DEFAULT 'advance',
  fakturoid_invoice_id TEXT,
  invoice_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CZK',
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_job_invoices_job_id ON crm_job_invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_crm_job_invoices_status ON crm_job_invoices(status);
CREATE INDEX IF NOT EXISTS idx_crm_job_invoices_type ON crm_job_invoices(invoice_type);
