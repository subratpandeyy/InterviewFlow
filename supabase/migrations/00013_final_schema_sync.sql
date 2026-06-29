-- FINAL SCHEMA SYNC: Add all columns, tables, indexes, RLS, triggers
-- that were defined in migrations 00009-00012 but never applied.
-- All statements use IF NOT EXISTS / DROP...CREATE for idempotency.

-- ============================================================
-- 1. POSITIONS — add missing columns
-- ============================================================
alter table positions add column if not exists employment_type text
  check (employment_type in ('full-time', 'part-time', 'contract', 'internship'));

alter table positions add column if not exists location text;

alter table positions add column if not exists skills text[] default '{}';

alter table positions add column if not exists status text not null default 'open'
  check (status in ('open', 'closed', 'on-hold', 'filled'));

alter table positions add column if not exists created_by uuid
  references profiles(id) on delete set null;

alter table positions add column if not exists deleted_at timestamptz;

create index if not exists idx_positions_status on positions(status);
create index if not exists idx_positions_deleted_at on positions(deleted_at) where deleted_at is null;

-- ============================================================
-- 2. CANDIDATES — add missing columns
-- ============================================================
alter table candidates add column if not exists recruiter_id uuid
  references profiles(id) on delete set null;

alter table candidates add column if not exists deleted_at timestamptz;

alter table candidates add column if not exists access_token text unique;

alter table candidates add column if not exists access_token_expires_at timestamptz;

alter table candidates add column if not exists email_verified_at timestamptz;

create index if not exists idx_candidates_recruiter on candidates(recruiter_id);
create index if not exists idx_candidates_deleted_at on candidates(deleted_at) where deleted_at is null;
create index if not exists idx_candidates_status on candidates(status);
create index if not exists idx_candidates_access_token on candidates(access_token);

-- ============================================================
-- 3. INVITATIONS — add missing columns
-- ============================================================
alter table invitations add column if not exists status text not null default 'pending'
  check (status in ('pending', 'accepted', 'expired', 'cancelled'));

alter table invitations add column if not exists revoked_at timestamptz;

create index if not exists idx_invitations_status on invitations(status);

-- Backfill existing invitations
update invitations set status = 'accepted' where accepted_at is not null and status is null;
update invitations set status = 'expired' where expires_at < now() and status is null and accepted_at is null;
update invitations set status = 'pending' where status is null;

-- ============================================================
-- 4. INTERVIEWS — add missing columns + fix check constraint
-- ============================================================
alter table interviews add column if not exists deleted_at timestamptz;

create index if not exists idx_interviews_deleted_at on interviews(deleted_at) where deleted_at is null;

-- Update status check constraint to include 'confirmed'
do $$
begin
  alter table interviews drop constraint if exists interviews_status_check;
  alter table interviews add constraint interviews_status_check
    check (status in ('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));
exception
  when others then
    alter table interviews drop constraint if exists interviews_status_check1;
    alter table interviews add constraint interviews_status_check
      check (status in ('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));
end $$;

-- ============================================================
-- 5. NEW TABLE: interview_feedback
-- ============================================================
create table if not exists interview_feedback (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  interviewer_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  communication int not null check (communication between 1 and 5),
  technical_skills int not null check (technical_skills between 1 and 5),
  problem_solving int not null check (problem_solving between 1 and 5),
  comments text,
  recommendation text not null check (recommendation in ('hire', 'maybe', 'reject')),
  is_finalized boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_id, interviewer_id)
);

alter table interview_feedback enable row level security;

create index if not exists idx_interview_feedback_interview on interview_feedback(interview_id);
create index if not exists idx_interview_feedback_interviewer on interview_feedback(interviewer_id);

-- RLS for interview_feedback
drop policy if exists "Interviewers manage own feedback" on interview_feedback;
create policy "Interviewers manage own feedback"
  on interview_feedback for all
  using (interviewer_id in (
    select id from profiles where user_id = auth.uid()
  ));

drop policy if exists "Feedback viewable within org" on interview_feedback;
create policy "Feedback viewable within org"
  on interview_feedback for select
  using (interview_id in (
    select id from interviews where organization_id in (
      select get_user_organization_ids()
    )
  ));

-- Trigger for updated_at
drop trigger if exists update_interview_feedback_updated_at on interview_feedback;
create trigger update_interview_feedback_updated_at
  before update on interview_feedback
  for each row execute function update_updated_at_column();

-- Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'interview_feedback'
  ) then
    alter publication supabase_realtime add table interview_feedback;
  end if;
end $$;

-- ============================================================
-- 6. NEW TABLE: candidate_sessions
-- ============================================================
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

create index if not exists idx_candidate_sessions_token on candidate_sessions(session_token);
create index if not exists idx_candidate_sessions_candidate on candidate_sessions(candidate_id);

-- RLS for candidate_sessions
drop policy if exists "Candidates can read own sessions" on candidate_sessions;
create policy "Candidates can read own sessions"
  on candidate_sessions for select
  using (candidate_id in (
    select id from candidates where access_token is not null
  ));

-- Realtime
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'candidate_sessions') then
    alter publication supabase_realtime add table candidate_sessions;
  end if;
end;
$$;

-- ============================================================
-- 7. OTP function
-- ============================================================
create or replace function generate_otp()
returns text
language sql
as $$
  select lpad(floor(random() * 1000000)::text, 6, '0');
$$;

-- ============================================================
-- 8. RLS: Admin manage positions, candidates, interviews
-- ============================================================
drop policy if exists "Admins manage positions" on positions;
create policy "Admins manage positions"
  on positions for all
  using (organization_id in (select get_user_organization_ids()))
  with check (organization_id in (select get_user_organization_ids()));

drop policy if exists "Admins manage candidates" on candidates;
create policy "Admins manage candidates"
  on candidates for all
  using (organization_id in (select get_user_organization_ids()))
  with check (organization_id in (select get_user_organization_ids()));

drop policy if exists "Admins manage interviews" on interviews;
create policy "Admins manage interviews"
  on interviews for all
  using (organization_id in (select get_user_organization_ids()))
  with check (organization_id in (select get_user_organization_ids()));

-- ============================================================
-- 9. RLS: Recruiter manage candidates
-- ============================================================
drop policy if exists "Recruiters manage candidates" on candidates;
create policy "Recruiters manage candidates"
  on candidates for all
  using (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role = 'recruiter'
  ));

-- ============================================================
-- 10. RLS: Recruiter manage positions
-- ============================================================
drop policy if exists "Recruiters manage positions" on positions;
create policy "Recruiters manage positions"
  on positions for insert
  with check (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role = 'recruiter'
  ));

-- ============================================================
-- 11. RLS: Organization members manage invitations
-- ============================================================
drop policy if exists "Members manage invitations" on invitations;
create policy "Members manage invitations"
  on invitations for all
  using (organization_id in (select get_user_organization_ids()));

-- ============================================================
-- 12. RLS: Anonymous booking access
-- ============================================================
drop policy if exists "Bookings can be updated via booking flow" on bookings;
create policy "Bookings can be updated via booking flow"
  on bookings for update
  using (true);

drop policy if exists "Interviews are publicly readable via booking" on interviews;
create policy "Interviews are publicly readable via booking"
  on interviews for select
  using (booking_token is not null);

-- ============================================================
-- 13. RLS: Candidate portal access (read/update own record)
-- ============================================================
drop policy if exists "Candidates can read own record via token" on candidates;
create policy "Candidates can read own record via token"
  on candidates for select
  using (true);

drop policy if exists "Candidates can update own resume" on candidates;
create policy "Candidates can update own resume"
  on candidates for update
  using (true)
  with check (true);

-- ============================================================
-- 14. Realtime: add tables to publication
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'candidate_sessions'
  ) then
    alter publication supabase_realtime add table candidate_sessions;
  end if;
end $$;
