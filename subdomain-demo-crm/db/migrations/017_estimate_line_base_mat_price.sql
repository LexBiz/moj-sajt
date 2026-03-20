-- Add base_mat_price to crm_estimate_lines so original material price survives page reload
ALTER TABLE crm_estimate_lines
  ADD COLUMN IF NOT EXISTS base_mat_price numeric(12,2) DEFAULT 0;
