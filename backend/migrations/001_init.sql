CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  membership_capacity INTEGER NOT NULL CHECK (membership_capacity > 0),
  offer_deadline_days INTEGER NOT NULL DEFAULT 7 CHECK (offer_deadline_days > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_settings_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  membership_type TEXT NOT NULL DEFAULT 'Individual',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned')),
  join_date DATE NOT NULL,
  leave_date DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waitlist_applicants (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  application_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'offered', 'accepted', 'declined', 'expired')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS membership_offers (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL REFERENCES waitlist_applicants(id),
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER REFERENCES waitlist_applicants(id),
  offer_id INTEGER REFERENCES membership_offers(id),
  channel TEXT NOT NULL DEFAULT 'email',
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_order ON waitlist_applicants(status, application_datetime);
CREATE INDEX IF NOT EXISTS idx_offers_status_expires ON membership_offers(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

INSERT INTO club_settings (id, membership_capacity, offer_deadline_days)
VALUES (1, 50, 7)
ON CONFLICT (id) DO UPDATE
SET membership_capacity = EXCLUDED.membership_capacity,
    offer_deadline_days = EXCLUDED.offer_deadline_days,
    updated_at = NOW();
