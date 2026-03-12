CREATE TABLE IF NOT EXISTS crm_service_catalog_items (
  id BIGSERIAL PRIMARY KEY,
  trade_type TEXT NOT NULL DEFAULT 'electro',
  building_type TEXT,
  phase_key TEXT NOT NULL DEFAULT 'preparation',
  category_key TEXT NOT NULL DEFAULT 'general',
  subcategory_key TEXT,
  item_name TEXT NOT NULL,
  item_description TEXT,
  unit TEXT NOT NULL DEFAULT 'ks',
  base_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CZK',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_catalog_trade ON crm_service_catalog_items(trade_type);
CREATE INDEX IF NOT EXISTS idx_crm_catalog_phase ON crm_service_catalog_items(phase_key);
CREATE INDEX IF NOT EXISTS idx_crm_catalog_category ON crm_service_catalog_items(category_key);
CREATE INDEX IF NOT EXISTS idx_crm_catalog_building ON crm_service_catalog_items(building_type);
CREATE INDEX IF NOT EXISTS idx_crm_catalog_active_sort ON crm_service_catalog_items(is_active, sort_order);

CREATE TABLE IF NOT EXISTS crm_estimates (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT REFERENCES crm_leads(id) ON DELETE SET NULL,
  estimate_no TEXT UNIQUE,
  client_number_snapshot TEXT,
  title TEXT NOT NULL,
  trade_type TEXT NOT NULL DEFAULT 'electro',
  building_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'CZK',
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 21.00,
  notes TEXT,
  subtotal_base NUMERIC(14,2) NOT NULL DEFAULT 0,
  subtotal_client NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_no_vat NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_with_vat NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_estimates_lead_id ON crm_estimates(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_estimates_status ON crm_estimates(status);
CREATE INDEX IF NOT EXISTS idx_crm_estimates_created_at ON crm_estimates(created_at DESC);

CREATE TABLE IF NOT EXISTS crm_estimate_lines (
  id BIGSERIAL PRIMARY KEY,
  estimate_id BIGINT NOT NULL REFERENCES crm_estimates(id) ON DELETE CASCADE,
  catalog_item_id BIGINT REFERENCES crm_service_catalog_items(id) ON DELETE SET NULL,
  phase_key TEXT NOT NULL DEFAULT 'preparation',
  category_key TEXT NOT NULL DEFAULT 'general',
  item_name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ks',
  quantity NUMERIC(14,2) NOT NULL DEFAULT 0,
  base_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  client_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_base NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_client NUMERIC(14,2) NOT NULL DEFAULT 0,
  position_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_estimate_lines_estimate_id ON crm_estimate_lines(estimate_id);
CREATE INDEX IF NOT EXISTS idx_crm_estimate_lines_position ON crm_estimate_lines(estimate_id, position_order);
