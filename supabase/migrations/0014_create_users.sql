-- Migration: create users table to receive imported Dexie users

CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  name text,
  email text,
  role text,
  is_active boolean,
  background_check_status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
