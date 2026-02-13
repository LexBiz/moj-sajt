-- 003_assistant_memory.sql
-- Personal Assistant memory for admin/CRM: notes, tasks, reminders, chat log.

CREATE TABLE IF NOT EXISTS assistant_items (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- note | task | reminder | fact | project
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | done | cancelled
  priority INT,
  due_at TIMESTAMPTZ,
  remind_at TIMESTAMPTZ,
  reminded_at TIMESTAMPTZ,
  tags JSONB,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_items_tenant_idx ON assistant_items(tenant_id);
CREATE INDEX IF NOT EXISTS assistant_items_kind_idx ON assistant_items(kind);
CREATE INDEX IF NOT EXISTS assistant_items_status_idx ON assistant_items(status);
CREATE INDEX IF NOT EXISTS assistant_items_due_at_idx ON assistant_items(due_at);
CREATE INDEX IF NOT EXISTS assistant_items_remind_at_idx ON assistant_items(remind_at);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user | assistant | system
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assistant_messages_tenant_idx ON assistant_messages(tenant_id);
CREATE INDEX IF NOT EXISTS assistant_messages_created_at_idx ON assistant_messages(created_at);

