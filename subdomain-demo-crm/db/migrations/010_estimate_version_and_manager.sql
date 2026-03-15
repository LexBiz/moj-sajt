ALTER TABLE crm_estimates
  ADD COLUMN IF NOT EXISTS version_no INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS project_manager_snapshot TEXT;
