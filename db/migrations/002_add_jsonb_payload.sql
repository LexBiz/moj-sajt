-- 002_add_jsonb_payload.sql
-- Keep schema flexible: store full objects as JSONB to avoid migrations for every new field.

ALTER TABLE tenant_profiles
  ADD COLUMN IF NOT EXISTS data JSONB;

ALTER TABLE channel_connections
  ADD COLUMN IF NOT EXISTS data JSONB;

