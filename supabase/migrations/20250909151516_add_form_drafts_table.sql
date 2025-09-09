-- Create form_drafts table for persisting user form drafts
-- This supports both authenticated users (with auth.uid()) and demo users (with custom user_id)

create table if not exists form_drafts (
  id text primary key,           -- `${form_name}::${user_id}`
  form_name text not null,
  user_id uuid not null,
  payload jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

-- Create unique index to ensure one draft per user per form
create unique index if not exists form_drafts_user_form
  on form_drafts (user_id, form_name);

-- Create index for faster lookups by user_id
create index if not exists form_drafts_user_id_idx
  on form_drafts (user_id);

-- Create index for cleanup queries by updated_at
create index if not exists form_drafts_updated_at_idx
  on form_drafts (updated_at);

-- Enable Row Level Security
alter table form_drafts enable row level security;

-- Policy: users can only access their own drafts
-- This works for authenticated users via auth.uid()
create policy "users_can_access_own_drafts"
on form_drafts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- For demo mode, we'll need service role access since there's no auth.uid()
-- The application will handle authorization at the service layer