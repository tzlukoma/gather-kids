-- Add leader_profiles table
CREATE TABLE IF NOT EXISTS leader_profiles (
  leader_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  photo_url text,
  avatar_path text,
  notes text,
  background_check_complete boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add leader_assignments table
CREATE TABLE IF NOT EXISTS leader_assignments (
  assignment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id uuid REFERENCES leader_profiles(leader_id) ON DELETE CASCADE,
  ministry_id text REFERENCES ministries(ministry_id) ON DELETE CASCADE,
  cycle_id text,
  role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add ministry_accounts table
CREATE TABLE IF NOT EXISTS ministry_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id text REFERENCES ministries(ministry_id) ON DELETE CASCADE,
  email text,
  display_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ministry_id)
);
