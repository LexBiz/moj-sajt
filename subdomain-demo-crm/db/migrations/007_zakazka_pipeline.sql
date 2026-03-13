-- 007: Zakazka Pipeline -- customers, jobs, documents, events, tasks

CREATE TABLE IF NOT EXISTS crm_customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company_name TEXT,
  ico TEXT,
  dic TEXT,
  client_type TEXT NOT NULL DEFAULT 'osoba',
  phone TEXT,
  email TEXT,
  address TEXT,
  ares_data JSONB,
  internal_number TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_customers_email ON crm_customers(lower(email));
CREATE INDEX IF NOT EXISTS idx_crm_customers_ico ON crm_customers(ico) WHERE ico IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_customers_internal ON crm_customers(internal_number) WHERE internal_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm_jobs (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES crm_customers(id) ON DELETE SET NULL,
  lead_id BIGINT REFERENCES crm_leads(id) ON DELETE SET NULL,
  internal_number TEXT UNIQUE,
  title TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'kombinovana',
  source TEXT NOT NULL DEFAULT 'web_form',

  stage TEXT NOT NULL DEFAULT 'nova_poptavka',

  received_at TIMESTAMPTZ DEFAULT now(),
  form_sent_at TIMESTAMPTZ,
  form_received_at TIMESTAMPTZ,
  offer_sent_at TIMESTAMPTZ,
  offer_approved_at TIMESTAMPTZ,
  order_signed_at TIMESTAMPTZ,
  deposit_paid_at TIMESTAMPTZ,
  planned_start DATE,
  planned_end DATE,
  actual_start DATE,
  actual_end DATE,
  handover_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  total_price NUMERIC(14,2) DEFAULT 0,
  deposit_amount NUMERIC(14,2) DEFAULT 0,
  deposit_invoice_id TEXT,
  deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  final_invoice_id TEXT,
  final_paid BOOLEAN NOT NULL DEFAULT FALSE,
  costs NUMERIC(14,2) DEFAULT 0,
  profit NUMERIC(14,2) DEFAULT 0,

  responsible_person TEXT,
  client_contact_person TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  blocking_factor TEXT,
  waiting_for TEXT,
  risk_level TEXT NOT NULL DEFAULT 'none',

  order_sent BOOLEAN NOT NULL DEFAULT FALSE,
  client_signed BOOLEAN NOT NULL DEFAULT FALSE,
  we_signed BOOLEAN NOT NULL DEFAULT FALSE,

  realization_status TEXT DEFAULT 'priprava',
  handover_planned BOOLEAN NOT NULL DEFAULT FALSE,
  handover_protocol_ready BOOLEAN NOT NULL DEFAULT FALSE,
  handover_signed BOOLEAN NOT NULL DEFAULT FALSE,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_jobs_customer ON crm_jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_lead ON crm_jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_stage ON crm_jobs(stage);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_priority ON crm_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_risk ON crm_jobs(risk_level);
CREATE INDEX IF NOT EXISTS idx_crm_jobs_internal ON crm_jobs(internal_number) WHERE internal_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_jobs_created ON crm_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS crm_job_documents (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES crm_jobs(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_job_docs_job ON crm_job_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_crm_job_docs_type ON crm_job_documents(doc_type);

CREATE TABLE IF NOT EXISTS crm_job_events (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES crm_jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  description TEXT,
  actor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_job_events_job ON crm_job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_crm_job_events_created ON crm_job_events(created_at DESC);

CREATE TABLE IF NOT EXISTS crm_job_tasks (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES crm_jobs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_job_tasks_job ON crm_job_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_crm_job_tasks_status ON crm_job_tasks(status);
