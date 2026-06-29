-- CRUD Complete: Missing columns, FKs, soft delete, indexes, RLS policies

-- ============================================================
-- 1. ENHANCE positions TABLE
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
-- 2. ENHANCE candidates TABLE
-- ============================================================

alter table candidates add column if not exists recruiter_id uuid
  references profiles(id) on delete set null;

alter table candidates add column if not exists deleted_at timestamptz;

create index if not exists idx_candidates_recruiter on candidates(recruiter_id);
create index if not exists idx_candidates_deleted_at on candidates(deleted_at) where deleted_at is null;
create index if not exists idx_candidates_status on candidates(status);

-- ============================================================
-- 3. ENHANCE invitations TABLE
-- ============================================================

alter table invitations add column if not exists status text not null default 'pending'
  check (status in ('pending', 'accepted', 'expired', 'cancelled'));

alter table invitations add column if not exists revoked_at timestamptz;

create index if not exists idx_invitations_status on invitations(status);

-- Backfill existing invitations
update invitations set status = 'accepted' where accepted_at is not null and status = 'pending';
update invitations set status = 'expired' where expires_at < now() and status = 'pending';

-- ============================================================
-- 4. ENHANCE interviews TABLE (soft delete)
-- ============================================================

alter table interviews add column if not exists deleted_at timestamptz;

create index if not exists idx_interviews_deleted_at on interviews(deleted_at) where deleted_at is null;

-- ============================================================
-- 5. NEW TABLE: interview_feedback (extended feedback with edit support)
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

create index if not exists idx_interview_feedback_interview on interview_feedback(interview_id);
create index if not exists idx_interview_feedback_interviewer on interview_feedback(interviewer_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'interview_feedback'
  ) then
    alter publication supabase_realtime add table interview_feedback;
  end if;
end;
$$;

drop trigger if exists update_interview_feedback_updated_at on interview_feedback;
create trigger update_interview_feedback_updated_at
  before update on interview_feedback
  for each row execute function update_updated_at_column();

-- ============================================================
-- 6. RLS: Allow admins full access within org
-- ============================================================

-- Admin can manage all positions
drop policy if exists "Admins manage positions" on positions;
create policy "Admins manage positions"
  on positions for all
  using (organization_id in (select get_user_organization_ids()))
  with check (organization_id in (select get_user_organization_ids()));

-- Admin can manage all candidates
drop policy if exists "Admins manage candidates" on candidates;
create policy "Admins manage candidates"
  on candidates for all
  using (organization_id in (select get_user_organization_ids()))
  with check (organization_id in (select get_user_organization_ids()));

-- Admin can manage all interviews
drop policy if exists "Admins manage interviews" on interviews;
create policy "Admins manage interviews"
  on interviews for all
  using (organization_id in (select get_user_organization_ids()))
  with check (organization_id in (select get_user_organization_ids()));

-- ============================================================
-- 7. RLS: Recruiter can manage candidates
-- ============================================================

drop policy if exists "Recruiters manage candidates" on candidates;
create policy "Recruiters manage candidates"
  on candidates for all
  using (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role = 'recruiter'
  ));

-- ============================================================
-- 8. RLS: Recruiter can manage positions
-- ============================================================

drop policy if exists "Recruiters manage positions" on positions;
create policy "Recruiters manage positions"
  on positions for insert
  with check (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role = 'recruiter'
  ));

-- ============================================================
-- 9. RLS: Organization members can manage invitations
-- ============================================================

drop policy if exists "Members manage invitations" on invitations;
create policy "Members manage invitations"
  on invitations for all
  using (organization_id in (select get_user_organization_ids()));
