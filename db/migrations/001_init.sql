-- 001_init.sql
-- Minimal SaaS schema for TemoWeb multi-tenant core.

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'START',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_profiles (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  niche TEXT,
  offer TEXT,
  faq TEXT,
  language TEXT,
  timezone TEXT,
  manager_telegram_id TEXT,
  features JSONB,
  limits JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  external_id TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);

CREATE TABLE IF NOT EXISTS leads (
  id BIGINT PRIMARY KEY,
  tenant_id TEXT,
  name TEXT,
  contact TEXT NOT NULL,
  email TEXT,
  business_type TEXT,
  channel TEXT,
  pain TEXT,
  question TEXT,
  client_messages JSONB,
  ai_recommendation TEXT,
  ai_summary TEXT,
  ai_readiness JSONB,
  source TEXT,
  lang TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_tenant_id_idx ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at);
CREATE INDEX IF NOT EXISTS channel_connections_tenant_idx ON channel_connections(tenant_id);

