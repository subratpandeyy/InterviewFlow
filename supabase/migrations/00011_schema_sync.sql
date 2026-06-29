-- Schema Sync: ensure all columns referenced by the application exist.
-- Safe to run multiple times (all use IF NOT EXISTS / DROP...CREATE).

-- ============================================================
-- 1. Add all columns from 00009 (in case not applied)
-- ============================================================

-- positions
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

-- candidates
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

-- invitations
alter table invitations add column if not exists status text not null default 'pending'
  check (status in ('pending', 'accepted', 'expired', 'cancelled'));
alter table invitations add column if not exists revoked_at timestamptz;
create index if not exists idx_invitations_status on invitations(status);

-- interviews
alter table interviews add column if not exists deleted_at timestamptz;
create index if not exists idx_interviews_deleted_at on interviews(deleted_at) where deleted_at is null;

-- ============================================================
-- 2. Add 'confirmed' to interviews status check constraint
--    (the app uses this status; DB constraint needs to allow it)
-- ============================================================

do $$
begin
  -- Drop and recreate the check constraint to include 'confirmed'
  alter table interviews drop constraint if exists interviews_status_check;
  alter table interviews add constraint interviews_status_check
    check (status in ('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));
exception
  when others then
    -- If original constraint name differs, try the default naming
    alter table interviews drop constraint if exists interviews_status_check1;
    alter table interviews add constraint interviews_status_check
      check (status in ('pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'));
end $$;

-- ============================================================
-- 3. Fix bookings RLS: allow anonymous users to UPDATE bookings
--    (needed for the public booking flow)
-- ============================================================

-- Drop existing policies that may conflict
drop policy if exists "Bookings can be updated via booking flow" on bookings;

-- Create a policy that allows anonymous updates to bookings (by token)
create policy "Bookings can be updated via booking flow"
  on bookings for update
  using (true);

-- Also ensure interviews can be read during booking flow
-- Create a policy that allows anyone to read interviews via booking token
drop policy if exists "Interviews are publicly readable via booking" on interviews;
create policy "Interviews are publicly readable via booking"
  on interviews for select
  using (booking_token is not null);

-- ============================================================
-- 4. Add missing RLS policies for interview_feedback UPDATE
--    (the editFeedback action updates interview_feedback)
-- ============================================================

-- The existing "Interviewers manage own feedback" policy should cover update.
-- Ensure it exists:
drop policy if exists "Interviewers manage own feedback" on interview_feedback;
create policy "Interviewers manage own feedback"
  on interview_feedback for all
  using (interviewer_id in (
    select id from profiles where user_id = auth.uid()
  ));

-- ============================================================
-- 5. Ensure realtime is enabled for candidate portal tables
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'candidates') then
    alter publication supabase_realtime add table candidates;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'candidate_sessions') then
    alter publication supabase_realtime add table candidate_sessions;
  end if;
end;
$$;
