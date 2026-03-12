CREATE TABLE IF NOT EXISTS crm_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  last_name TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  proposal_lead_email TEXT,
  phone TEXT,
  comment TEXT,
  lang TEXT NOT NULL DEFAULT 'ua',
  status TEXT NOT NULL DEFAULT 'new_request',
  source TEXT NOT NULL DEFAULT 'web_form',
  manager TEXT NOT NULL DEFAULT 'Не призначено',
  service_type TEXT NOT NULL DEFAULT 'Не вказано',
  manager_comment TEXT,
  brief JSONB,
  brief_received_at TIMESTAMPTZ,
  proposal_mail_state TEXT,
  proposal_sent_at TIMESTAMPTZ,
  proposal_error TEXT,
  wave SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_created_at ON crm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_leads_source ON crm_leads(source);
CREATE INDEX IF NOT EXISTS idx_crm_leads_manager ON crm_leads(manager);
CREATE INDEX IF NOT EXISTS idx_crm_leads_service_type ON crm_leads(service_type);
CREATE INDEX IF NOT EXISTS idx_crm_leads_wave ON crm_leads(wave);
CREATE INDEX IF NOT EXISTS idx_crm_leads_email ON crm_leads(lower(email));
CREATE INDEX IF NOT EXISTS idx_crm_leads_proposal_email ON crm_leads(lower(proposal_lead_email));

CREATE TABLE IF NOT EXISTS crm_commercial_cases (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES crm_leads(id) ON DELETE SET NULL,
  client_type TEXT NOT NULL DEFAULT 'person',
  company_name TEXT,
  company_ico TEXT,
  person_name TEXT,
  person_email TEXT,
  person_phone TEXT,
  order_type TEXT NOT NULL DEFAULT 'combined',
  internal_order_id TEXT UNIQUE,
  offer_amount NUMERIC(12,2),
  notes TEXT,
  stage TEXT NOT NULL DEFAULT 'preparation',
  status TEXT NOT NULL DEFAULT 'contacted',
  start_date DATE,
  end_date DATE,
  company_manager TEXT,
  client_contact_name TEXT,
  client_contact_phone TEXT,
  client_contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_cases_status ON crm_commercial_cases(status);
CREATE INDEX IF NOT EXISTS idx_crm_cases_order_type ON crm_commercial_cases(order_type);
CREATE INDEX IF NOT EXISTS idx_crm_cases_internal_order_id ON crm_commercial_cases(internal_order_id);
CREATE INDEX IF NOT EXISTS idx_crm_cases_start_date ON crm_commercial_cases(start_date);
CREATE INDEX IF NOT EXISTS idx_crm_cases_end_date ON crm_commercial_cases(end_date);

CREATE TABLE IF NOT EXISTS crm_suppliers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  ico TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  specialization TEXT,
  specialization_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_suppliers_spec_type ON crm_suppliers(specialization_type);

CREATE TABLE IF NOT EXISTS crm_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_audit_created_at ON crm_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_audit_entity ON crm_audit_log(entity_type, entity_id);
