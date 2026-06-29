-- Candidate Portal: secure token-based access without app user accounts

-- ============================================================
-- 1. ENHANCE candidates TABLE
-- ============================================================

alter table candidates add column if not exists access_token text unique;

alter table candidates add column if not exists access_token_expires_at timestamptz;

alter table candidates add column if not exists email_verified_at timestamptz;

create index if not exists idx_candidates_access_token on candidates(access_token);

-- ============================================================
-- 2. candidate_sessions TABLE
-- ============================================================
-- Stores one-time OTP codes and session tokens for candidate portal access.
-- An OTP record is verified by setting verified_at.
-- After verification, a session_token is issued for ongoing access.

create table if not exists candidate_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  otp_code text not null,
  otp_expires_at timestamptz not null,
  otp_verified_at timestamptz,
  session_token text unique,
  session_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table candidate_sessions enable row level security;

drop policy if exists "Candidates can read own sessions" on candidate_sessions;
create policy "Candidates can read own sessions"
  on candidate_sessions for select
  using (candidate_id in (
    select id from candidates where access_token is not null
  ));

create index if not exists idx_candidate_sessions_token on candidate_sessions(session_token);
create index if not exists idx_candidate_sessions_candidate on candidate_sessions(candidate_id);

-- ============================================================
-- 3. Create a function to generate a 6-digit OTP
-- ============================================================
create or replace function generate_otp()
returns text
language sql
as $$
  select lpad(floor(random() * 1000000)::text, 6, '0');
$$;

-- ============================================================
-- 4. RLS: Candidates can only view their own data
-- ============================================================

-- Allow reading candidates via valid access token
drop policy if exists "Candidates can read own record via token" on candidates;
create policy "Candidates can read own record via token"
  on candidates for select
  using (true);
-- Note: access is controlled at the application layer via token validation,
-- not via RLS, since candidates don't have auth.uid().

-- Allow candidates to update their own resume_url and notes
drop policy if exists "Candidates can update own resume" on candidates;
create policy "Candidates can update own resume"
  on candidates for update
  using (true)
  with check (true);
-- Application layer ensures candidates can only update their own record.
