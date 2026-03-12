ALTER TABLE crm_service_catalog_items
  ADD COLUMN IF NOT EXISTS source_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_catalog_source_code_unique
  ON crm_service_catalog_items(source_code)
  WHERE source_code IS NOT NULL;
