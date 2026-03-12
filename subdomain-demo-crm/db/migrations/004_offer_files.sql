ALTER TABLE crm_commercial_offers
  ADD COLUMN IF NOT EXISTS files JSONB NOT NULL DEFAULT '[]'::jsonb;
