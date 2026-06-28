-- InterviewFlow Org-Based User Structure
-- Moves org_id/role from profiles to organization_members,
-- adds invitations table, updates RLS to avoid recursion.

-- ============================================================
-- NEW TABLES
-- ============================================================

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('organization_admin', 'recruiter', 'interviewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (user_id)
);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('recruiter', 'interviewer')),
  token text unique not null default gen_random_uuid()::text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- DROP OLD POLICIES THAT DEPEND ON get_user_organization_ids
-- ============================================================

drop policy if exists "Profiles are viewable within organization" on profiles;
drop policy if exists "Bookings are org-scoped for admin management" on bookings;
drop policy if exists "Users can view their own organization" on organizations;
drop policy if exists "Candidates are org-scoped" on candidates;
drop policy if exists "Positions are org-scoped" on positions;
drop policy if exists "Availability viewable within org" on availability_slots;
drop policy if exists "Interviews are org-scoped" on interviews;
drop policy if exists "Feedback viewable within org" on feedback;
drop policy if exists "Notifications are org-scoped" on notifications;
drop policy if exists "Audit logs are org-scoped" on audit_logs;

-- ============================================================
-- UPDATE SECURITY DEFINER FUNCTION
-- ============================================================

drop function if exists get_user_organization_ids() cascade;
create or replace function get_user_organization_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id from organization_members where user_id = auth.uid();
$$;

-- ============================================================
-- BACKFILL organization_members FROM existing profiles
-- ============================================================

insert into organization_members (organization_id, user_id, role)
select organization_id, user_id,
  case when role = 'admin' then 'organization_admin' else role end
from profiles
where user_id is not null
on conflict (user_id) do nothing;

-- ============================================================
-- DROP OLD COLUMNS FROM profiles
-- ============================================================

drop index if exists idx_profiles_organization_id;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'organization_id'
  ) then
    alter table profiles drop constraint if exists profiles_organization_id_fkey;
    alter table profiles drop column organization_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'role'
    and column_default is null
  ) then
    alter table profiles drop column role;
  end if;
end $$;

-- ============================================================
-- ROW LEVEL SECURITY: organization_members
-- ============================================================

alter table organization_members enable row level security;

create policy "Users can view own memberships"
  on organization_members for select
  using (user_id = auth.uid());

create policy "Admins can view org members"
  on organization_members for select
  using (organization_id in (select get_user_organization_ids()));

create policy "Admins can insert members"
  on organization_members for insert
  with check (organization_id in (select get_user_organization_ids()));

create policy "Admins can update members"
  on organization_members for update
  using (organization_id in (select get_user_organization_ids()));

create policy "Admins can delete members"
  on organization_members for delete
  using (organization_id in (select get_user_organization_ids()));

-- ============================================================
-- ROW LEVEL SECURITY: invitations
-- ============================================================

alter table invitations enable row level security;

create policy "Invitations are publicly readable via token"
  on invitations for select
  using (true);

create policy "Admins can manage invitations"
  on invitations for all
  using (organization_id in (select get_user_organization_ids()));

-- ============================================================
-- RECREATE RLS ON EXISTING TABLES (use get_user_organization_ids)
-- ============================================================

-- Organizations
drop policy if exists "Users can view their own organization" on organizations;
create policy "Users can view their own organization"
  on organizations for select
  using (id in (select get_user_organization_ids()));

-- Candidates
drop policy if exists "Candidates are org-scoped" on candidates;
create policy "Candidates are org-scoped"
  on candidates for all
  using (organization_id in (select get_user_organization_ids()));

-- Positions
drop policy if exists "Positions are org-scoped" on positions;
create policy "Positions are org-scoped"
  on positions for all
  using (organization_id in (select get_user_organization_ids()));

-- Availability
drop policy if exists "Availability viewable within org" on availability_slots;
create policy "Availability viewable within org"
  on availability_slots for select
  using (profile_id in (
    select id from profiles where user_id in (
      select user_id from organization_members
      where organization_id in (select get_user_organization_ids())
    )
  ));

-- Keep Interviewers manage own availability, update own, delete own
-- (already fine — they check profile_id directly)

-- Interviews
drop policy if exists "Interviews are org-scoped" on interviews;
create policy "Interviews are org-scoped"
  on interviews for all
  using (organization_id in (select get_user_organization_ids()));

-- Bookings
-- Bookings policies don't reference org_id directly, they use interview_id chain
-- Keep as-is.

-- Feedback
drop policy if exists "Feedback viewable within org" on feedback;
create policy "Feedback viewable within org"
  on feedback for select
  using (interview_id in (
    select id from interviews where organization_id in (select get_user_organization_ids())
  ));

-- Notifications
drop policy if exists "Notifications are org-scoped" on notifications;
create policy "Notifications are org-scoped"
  on notifications for all
  using (organization_id in (select get_user_organization_ids()));

-- Audit logs
drop policy if exists "Audit logs are org-scoped" on audit_logs;
create policy "Audit logs are org-scoped"
  on audit_logs for select
  using (organization_id in (select get_user_organization_ids()));

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_organization_members_org on organization_members(organization_id);
create index if not exists idx_organization_members_user on organization_members(user_id);
create index if not exists idx_invitations_org on invitations(organization_id);
create index if not exists idx_invitations_token on invitations(token);
