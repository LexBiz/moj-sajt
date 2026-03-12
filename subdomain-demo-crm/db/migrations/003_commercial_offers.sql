CREATE TABLE IF NOT EXISTS crm_commercial_offers (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES crm_leads(id) ON DELETE SET NULL,
  case_id BIGINT REFERENCES crm_commercial_cases(id) ON DELETE SET NULL,
  offer_no TEXT UNIQUE,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  template_key TEXT NOT NULL DEFAULT 'custom',
  currency TEXT NOT NULL DEFAULT 'CZK',
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  pricing_mode TEXT NOT NULL DEFAULT 'shop_markup',
  source_note TEXT,
  scope_summary TEXT,
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_labor NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal_material NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal_other NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal_no_vat NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_with_vat NUMERIC(14,2) NOT NULL DEFAULT 0,
  generated_by TEXT NOT NULL DEFAULT 'ai',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_offers_lead_id ON crm_commercial_offers(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_offers_case_id ON crm_commercial_offers(case_id);
CREATE INDEX IF NOT EXISTS idx_crm_offers_status ON crm_commercial_offers(status);
CREATE INDEX IF NOT EXISTS idx_crm_offers_created_at ON crm_commercial_offers(created_at DESC);
