-- Migration 011: Add user name field + seed default users

ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE crm_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

INSERT INTO crm_users (email, full_name, password_hash, role, created_at, updated_at)
VALUES
  ('owner@ol-masterdom.cz', 'Vlastník systému', '$2a$10$RLVQ/qxY1qm9oZgSACntX.gLP4Bsz8jMW/yCec8uNUoh3WT2Yakv6', 'owner', now(), now()),
  ('manager@ol-masterdom.cz', 'Manažer CRM', '$2a$10$SGhhnXXthACt6Rz1PoNyLO3NKow3aLAl1jRtcxcPiwjhxMJwDEfua', 'manager', now(), now()),
  ('pm@ol-masterdom.cz', 'Projektový manažer', '$2a$10$pQgEXsx0p7HiQMTXX3pMpOGEoFqo5rt2YrX66KHdaHTx3rzLIiL06', 'pm', now(), now())
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = now();
