-- 004_assistant_state.sql
-- Persistent key/value state for assistant (digest sent markers, etc.)

CREATE TABLE IF NOT EXISTS assistant_state (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, key)
);

CREATE INDEX IF NOT EXISTS assistant_state_tenant_idx ON assistant_state(tenant_id);

