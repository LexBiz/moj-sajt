ALTER TABLE crm_leads
  ADD COLUMN IF NOT EXISTS client_number TEXT;

CREATE INDEX IF NOT EXISTS idx_crm_leads_client_number
  ON crm_leads (client_number);
