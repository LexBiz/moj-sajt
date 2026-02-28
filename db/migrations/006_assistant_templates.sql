-- 006_assistant_templates.sql
-- Productized assistant setup:
-- 1) reusable assistant templates
-- 2) per-tenant binding to template + overrides

CREATE TABLE IF NOT EXISTS assistant_templates (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_templates_active_idx
  ON assistant_templates(is_active, updated_at DESC);

CREATE TABLE IF NOT EXISTS tenant_assistant_config (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  template_id TEXT REFERENCES assistant_templates(id) ON DELETE SET NULL,
  template_version INTEGER,
  overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tenant_assistant_config_template_idx
  ON tenant_assistant_config(template_id, updated_at DESC);

