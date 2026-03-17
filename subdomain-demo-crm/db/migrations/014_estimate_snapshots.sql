-- Migration 014: Estimate version snapshots
CREATE TABLE IF NOT EXISTS crm_estimate_snapshots (
  id          SERIAL PRIMARY KEY,
  estimate_id INTEGER NOT NULL REFERENCES crm_estimates(id) ON DELETE CASCADE,
  version_no  INTEGER NOT NULL DEFAULT 1,
  snapshot    JSONB NOT NULL,
  note        TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_snapshots_estimate_id ON crm_estimate_snapshots(estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimate_snapshots_created_at ON crm_estimate_snapshots(estimate_id, created_at DESC);

-- Column for matCoefficient in estimate lines
ALTER TABLE crm_estimate_lines ADD COLUMN IF NOT EXISTS mat_coefficient NUMERIC(10,4) DEFAULT 1;
