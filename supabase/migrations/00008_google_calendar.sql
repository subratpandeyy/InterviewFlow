-- Google Calendar Integration
-- Stores encrypted OAuth tokens for interviewer Google Calendar access.

create table if not exists google_calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  calendar_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create index if not exists idx_google_calendar_tokens_profile
  on google_calendar_tokens(profile_id);

alter table google_calendar_tokens enable row level security;

create policy "Interviewers manage own calendar tokens"
  on google_calendar_tokens for all
  using (profile_id in (
    select id from profiles where user_id = auth.uid()
  ));

-- Admins can view calendar connection status
create policy "Admins can view calendar tokens"
  on google_calendar_tokens for select
  using (profile_id in (
    select id from profiles where user_id in (
      select user_id from organization_members
      where organization_id in (select get_user_organization_ids())
        and role in ('organization_admin', 'recruiter')
    )
  ));

-- System-level access via service_role (used by API routes)
-- Service_role bypasses RLS, so no additional policy needed.

-- Realtime: notify on token changes (connect/disconnect)
alter publication supabase_realtime add table google_calendar_tokens;

-- Trigger for updated_at
drop trigger if exists update_google_calendar_tokens_updated_at on google_calendar_tokens;
create trigger update_google_calendar_tokens_updated_at
  before update on google_calendar_tokens
  for each row execute function update_updated_at_column();
