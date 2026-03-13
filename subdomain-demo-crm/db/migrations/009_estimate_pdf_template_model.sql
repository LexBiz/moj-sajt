ALTER TABLE crm_estimates
  ADD COLUMN IF NOT EXISTS job_id BIGINT REFERENCES crm_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimate_date DATE,
  ADD COLUMN IF NOT EXISTS job_number_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS client_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS company_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS customer_address_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS customer_ico_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS estimate_kind TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS other_costs_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note TEXT;

CREATE INDEX IF NOT EXISTS idx_crm_estimates_job_id ON crm_estimates(job_id);

ALTER TABLE crm_estimate_lines
  ADD COLUMN IF NOT EXISTS line_code TEXT,
  ADD COLUMN IF NOT EXISTS work_description TEXT,
  ADD COLUMN IF NOT EXISTS material_description TEXT,
  ADD COLUMN IF NOT EXISTS labor_unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS material_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS section_type TEXT NOT NULL DEFAULT 'elektro',
  ADD COLUMN IF NOT EXISTS group_key TEXT,
  ADD COLUMN IF NOT EXISTS group_label TEXT,
  ADD COLUMN IF NOT EXISTS source_catalog_code TEXT;

UPDATE crm_estimate_lines
SET work_description = COALESCE(work_description, item_name),
    material_description = COALESCE(material_description, ''),
    labor_unit_price = COALESCE(labor_unit_price, client_price, base_price, 0),
    labor_total = COALESCE(labor_total, total_client, total_base, 0),
    material_unit_price = COALESCE(material_unit_price, 0),
    material_total = COALESCE(material_total, 0),
    line_total = COALESCE(line_total, total_client, total_base, 0),
    group_key = COALESCE(group_key, category_key),
    group_label = COALESCE(group_label, category_key),
    source_catalog_code = COALESCE(source_catalog_code, NULL);
