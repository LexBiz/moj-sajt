-- 005_hardening_and_conversation_state.sql
-- Security + scale hardening primitives:
-- 1) strong tenant invariant for leads
-- 2) shared conversation state in DB
-- 3) shared rate-limit buckets in DB

INSERT INTO tenants (id, name, plan)
VALUES ('temoweb', 'TemoWeb', 'PRO')
ON CONFLICT (id) DO NOTHING;

UPDATE leads
SET tenant_id = 'temoweb'
WHERE tenant_id IS NULL OR BTRIM(tenant_id) = '';

ALTER TABLE leads
  ALTER COLUMN tenant_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'leads'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'leads_tenant_id_fkey'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS conversation_state (
  scope TEXT NOT NULL,
  conv_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, conv_key)
);

CREATE INDEX IF NOT EXISTS conversation_state_scope_updated_idx
  ON conversation_state(scope, updated_at DESC);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  scope TEXT NOT NULL,
  identity TEXT NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, identity, bucket_start)
);

CREATE INDEX IF NOT EXISTS api_rate_limits_scope_bucket_idx
  ON api_rate_limits(scope, bucket_start DESC);

