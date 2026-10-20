CREATE TABLE IF NOT EXISTS family_security_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  family_name text NOT NULL DEFAULT 'خانواده کوروش نوا',
  primary_owner_role text NOT NULL DEFAULT 'father' CHECK (primary_owner_role IN ('father','mother')),
  auth_method text NOT NULL DEFAULT 'pin' CHECK (auth_method IN ('pin','pattern','biometric')),
  biometric_allowed boolean NOT NULL DEFAULT false,
  has_credential boolean NOT NULL DEFAULT false,
  pin_salt text,
  pin_hash text,
  pattern_salt text,
  pattern_hash text,
  recovery_salt text,
  recovery_hash text,
  security_options jsonb NOT NULL DEFAULT '{
    "appStart": false,
    "speakerPower": false,
    "childLock": false,
    "nora": false,
    "contacts": false,
    "camera": false,
    "commandRoom": false,
    "lighting": false,
    "musicLibrary": false,
    "fuses": false,
    "diagnostics": false,
    "imageSettings": false,
    "liveMic": false
  }'::jsonb,
  policy_version integer NOT NULL DEFAULT 1 CHECK (policy_version > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS family_auth_codes (
  email text PRIMARY KEY,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS family_security_failures (
  subject_key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO family_security_settings(singleton, family_name, primary_owner_role)
VALUES (true, 'خانواده کوروش نوا', 'father')
ON CONFLICT (singleton) DO NOTHING;

-- API does not expose database credentials. Only the server account accesses these tables.
-- Do not grant direct table privileges to client roles; app requests go through server endpoints.
