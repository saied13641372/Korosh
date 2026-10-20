CREATE TABLE IF NOT EXISTS family_devices (
  device_id text PRIMARY KEY CHECK (device_id ~ '^[a-f0-9]{48}$'),
  token_hash text NOT NULL UNIQUE,
  device_name text NOT NULL DEFAULT 'گوشی خانواده کوروش نوا',
  device_role text NOT NULL DEFAULT 'member' CHECK (device_role IN ('admin','member')),
  created_by_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

CREATE TABLE IF NOT EXISTS family_pair_codes (
  code_hash text PRIMARY KEY,
  created_by_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS family_devices_active_idx ON family_devices (revoked_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS family_pair_codes_expiry_idx ON family_pair_codes (expires_at);
