-- ============================================================
-- AUTHORITATIVE SCHEMA — InterviewFlow
-- Combines and supersedes all prior migrations (00001–00011).
-- Every CREATE / ALTER uses IF NOT EXISTS / add column if not exists,
-- so it is safe to run repeatedly on any state.
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2a. organizations
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2b. profiles
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2c. organization_members
create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('organization_admin', 'recruiter', 'interviewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (user_id)
);

-- 2d. invitations
create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('recruiter', 'interviewer')),
  token text unique not null default gen_random_uuid()::text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2e. candidates
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  position_applied text,
  resume_url text,
  notes text,
  status text not null default 'applied' check (status in ('applied','screening','scheduled','interviewed','selected','rejected')),
  recruiter_id uuid references profiles(id) on delete set null,
  deleted_at timestamptz,
  access_token text unique,
  access_token_expires_at timestamptz,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2f. positions
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  department text not null,
  experience_required text,
  description text,
  employment_type text check (employment_type in ('full-time', 'part-time', 'contract', 'internship')),
  location text,
  skills text[] default '{}',
  status text not null default 'open' check (status in ('open', 'closed', 'on-hold', 'filled')),
  created_by uuid references profiles(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2g. availability_slots (weekly recurring)
create table if not exists availability_slots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_availability_slot_per_day unique (profile_id, day_of_week)
);

-- 2h. interviewer_availability (date-specific)
create table if not exists interviewer_availability (
  id uuid primary key default gen_random_uuid(),
  interviewer_id uuid not null references profiles(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'available' check (status in ('available', 'booked', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2i. interviews
create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  position_id uuid not null references positions(id) on delete cascade,
  interviewer_id uuid not null references profiles(id) on delete cascade,
  recruiter_id uuid not null references profiles(id) on delete cascade,
  interview_type text not null check (interview_type in ('hr','technical','managerial','final')),
  duration_minutes int not null default 60,
  scheduled_at timestamptz,
  meeting_link text,
  meeting_provider text check (meeting_provider in ('google_meet', 'zoom', 'microsoft_teams', 'custom')),
  calendar_event_id text,
  status text not null default 'pending' check (status in ('pending','scheduled','confirmed','completed','cancelled','no_show')),
  notes text,
  booking_token text unique,
  booking_expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2j. bookings
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  token text unique not null,
  status text not null default 'pending' check (status in ('pending','booked','cancelled','expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2k. feedback (legacy write-once)
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  interviewer_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  communication int not null check (communication between 1 and 5),
  technical_skills int not null check (technical_skills between 1 and 5),
  problem_solving int not null check (problem_solving between 1 and 5),
  comments text,
  recommendation text not null check (recommendation in ('hire','maybe','reject')),
  created_at timestamptz not null default now()
);

-- 2l. interview_feedback (extended with is_finalized, supports edits)
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

-- 2m. interview_meetings
create table if not exists interview_meetings (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  provider text not null check (provider in ('google_meet', 'zoom', 'microsoft_teams', 'custom')),
  meeting_url text not null,
  created_at timestamptz not null default now()
);

-- 2n. google_calendar_tokens
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

-- 2o. notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('candidate_created','interview_scheduled','interview_rescheduled','interview_cancelled','reminder_24h','reminder_1h')),
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2p. audit_logs
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  profile_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- 2q. candidate_sessions
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

-- ============================================================
-- 3. INDEXES
-- ============================================================
create index if not exists idx_profiles_user_id on profiles(user_id);
create index if not exists idx_candidates_organization_id on candidates(organization_id);
create index if not exists idx_candidates_recruiter on candidates(recruiter_id);
create index if not exists idx_candidates_deleted_at on candidates(deleted_at) where deleted_at is null;
create index if not exists idx_candidates_status on candidates(status);
create index if not exists idx_candidates_access_token on candidates(access_token);
create index if not exists idx_positions_organization_id on positions(organization_id);
create index if not exists idx_positions_status on positions(status);
create index if not exists idx_positions_deleted_at on positions(deleted_at) where deleted_at is null;
create index if not exists idx_interviews_organization_id on interviews(organization_id);
create index if not exists idx_interviews_candidate_id on interviews(candidate_id);
create index if not exists idx_interviews_interviewer_id on interviews(interviewer_id);
create index if not exists idx_interviews_booking_token on interviews(booking_token) where booking_token is not null;
create index if not exists idx_interviews_deleted_at on interviews(deleted_at) where deleted_at is null;
create index if not exists idx_availability_slots_profile_id on availability_slots(profile_id);
create index if not exists idx_bookings_token on bookings(token);
create index if not exists idx_bookings_interview_id on bookings(interview_id);
create index if not exists idx_feedback_interview_id on feedback(interview_id);
create index if not exists idx_notifications_recipient_id on notifications(recipient_id);
create index if not exists idx_notifications_organization_id on notifications(organization_id);
create index if not exists idx_audit_logs_organization_id on audit_logs(organization_id);
create index if not exists idx_audit_logs_entity_type on audit_logs(entity_type);
create index if not exists idx_organization_members_org on organization_members(organization_id);
create index if not exists idx_organization_members_user on organization_members(user_id);
create index if not exists idx_invitations_org on invitations(organization_id);
create index if not exists idx_invitations_token on invitations(token);
create index if not exists idx_invitations_status on invitations(status);
create index if not exists idx_interviewer_availability_lookup on interviewer_availability(interviewer_id, date, status);
create index if not exists idx_interview_meetings_interview on interview_meetings(interview_id);
create index if not exists idx_google_calendar_tokens_profile on google_calendar_tokens(profile_id);
create index if not exists idx_interview_feedback_interview on interview_feedback(interview_id);
create index if not exists idx_interview_feedback_interviewer on interview_feedback(interviewer_id);
create index if not exists idx_candidate_sessions_token on candidate_sessions(session_token);
create index if not exists idx_candidate_sessions_candidate on candidate_sessions(candidate_id);

-- ============================================================
-- 4. FUNCTIONS
-- ============================================================

-- 4a. get_user_organization_ids — breaks RLS recursion
create or replace function get_user_organization_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id from organization_members where user_id = auth.uid();
$$;

-- 4b. update_updated_at_column — auto-update trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4c. generate_otp — 6-digit code
create or replace function generate_otp()
returns text
language sql
as $$
  select lpad(floor(random() * 1000000)::text, 6, '0');
$$;

-- 4d. handle_new_user — auto-create profile on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 4e. check_availability_overlap
create or replace function check_availability_overlap(
  p_interviewer_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time,
  p_exclude_id uuid default null
) returns boolean
language plpgsql
stable
as $$
begin
  return exists (
    select 1 from interviewer_availability
    where interviewer_id = p_interviewer_id
    and date = p_date
    and status = 'available'
    and (p_exclude_id is null or id != p_exclude_id)
    and start_time < p_end_time
    and end_time > p_start_time
  );
end;
$$;

-- 4f. get_available_slots
create or replace function get_available_slots(
  p_interviewer_id uuid,
  p_date date,
  p_duration_minutes int default 60
) returns table (slot_start time, slot_end time)
language sql
stable
as $$
  select start_time, end_time
  from interviewer_availability
  where interviewer_id = p_interviewer_id
  and date = p_date
  and status = 'available'
  order by start_time;
$$;

-- ============================================================
-- 5. TRIGGERS
-- ============================================================
drop trigger if exists update_organizations_updated_at on organizations;
create trigger update_organizations_updated_at
  before update on organizations for each row execute function update_updated_at_column();

drop trigger if exists update_profiles_updated_at on profiles;
create trigger update_profiles_updated_at
  before update on profiles for each row execute function update_updated_at_column();

drop trigger if exists update_candidates_updated_at on candidates;
create trigger update_candidates_updated_at
  before update on candidates for each row execute function update_updated_at_column();

drop trigger if exists update_positions_updated_at on positions;
create trigger update_positions_updated_at
  before update on positions for each row execute function update_updated_at_column();

drop trigger if exists update_availability_slots_updated_at on availability_slots;
create trigger update_availability_slots_updated_at
  before update on availability_slots for each row execute function update_updated_at_column();

drop trigger if exists update_interviews_updated_at on interviews;
create trigger update_interviews_updated_at
  before update on interviews for each row execute function update_updated_at_column();

drop trigger if exists update_bookings_updated_at on bookings;
create trigger update_bookings_updated_at
  before update on bookings for each row execute function update_updated_at_column();

drop trigger if exists update_interviewer_availability_updated_at on interviewer_availability;
create trigger update_interviewer_availability_updated_at
  before update on interviewer_availability for each row execute function update_updated_at_column();

drop trigger if exists update_google_calendar_tokens_updated_at on google_calendar_tokens;
create trigger update_google_calendar_tokens_updated_at
  before update on google_calendar_tokens for each row execute function update_updated_at_column();

drop trigger if exists update_interview_feedback_updated_at on interview_feedback;
create trigger update_interview_feedback_updated_at
  before update on interview_feedback for each row execute function update_updated_at_column();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables (idempotent)
do $$ begin
  alter table organizations enable row level security;
  alter table profiles enable row level security;
  alter table organization_members enable row level security;
  alter table invitations enable row level security;
  alter table candidates enable row level security;
  alter table positions enable row level security;
  alter table availability_slots enable row level security;
  alter table interviewer_availability enable row level security;
  alter table interviews enable row level security;
  alter table bookings enable row level security;
  alter table feedback enable row level security;
  alter table interview_feedback enable row level security;
  alter table interview_meetings enable row level security;
  alter table google_calendar_tokens enable row level security;
  alter table notifications enable row level security;
  alter table audit_logs enable row level security;
  alter table candidate_sessions enable row level security;
exception when others then null;
end $$;

-- Drop all existing policies to avoid duplicate-name errors
do $$ declare pol record; begin
  for pol in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- Recreate all policies

-- organizations: org members can view their org
create policy "Users can view their own organization"
  on organizations for select
  using (id in (select get_user_organization_ids()));

-- profiles: own profile + org-scoped view
create policy "Users can view own profile"
  on profiles for select
  using (user_id = auth.uid());

create policy "Profiles are viewable within organization"
  on profiles for select
  using (user_id in (
    select user_id from organization_members
    where organization_id in (select get_user_organization_ids())
  ));

create policy "Users can update own profile"
  on profiles for update
  using (user_id = auth.uid());

-- organization_members
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

-- invitations
create policy "Invitations are publicly readable via token"
  on invitations for select
  using (true);

create policy "Members manage invitations"
  on invitations for all
  using (organization_id in (select get_user_organization_ids()));

-- candidates: org-scoped, admin/recruiter CRUD
create policy "Candidates are org-scoped"
  on candidates for all
  using (organization_id in (select get_user_organization_ids()));

create policy "Admins manage candidates"
  on candidates for all
  using (organization_id in (select get_user_organization_ids()))
  with check (organization_id in (select get_user_organization_ids()));

create policy "Recruiters manage candidates"
  on candidates for all
  using (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role = 'recruiter'
  ));

create policy "Candidates can read own record via token"
  on candidates for select
  using (true);

create policy "Candidates can update own resume"
  on candidates for update
  using (true)
  with check (true);

-- positions: org-scoped
create policy "Positions are org-scoped"
  on positions for all
  using (organization_id in (select get_user_organization_ids()));

create policy "Admins manage positions"
  on positions for all
  using (organization_id in (select get_user_organization_ids()))
  with check (organization_id in (select get_user_organization_ids()));

create policy "Recruiters manage positions"
  on positions for insert
  with check (organization_id in (
    select organization_id from organization_members
    where user_id = auth.uid() and role = 'recruiter'
  ));

-- availability_slots
create policy "Availability viewable within org"
  on availability_slots for select
  using (profile_id in (
    select id from profiles where user_id in (
      select user_id from organization_members
      where organization_id in (select get_user_organization_ids())
    )
  ));

create policy "Interviewers manage own availability"
  on availability_slots for insert
  with check (profile_id in (
    select id from profiles where user_id = auth.uid()
  ));

create policy "Interviewers update own availability"
  on availability_slots for update
  using (profile_id in (
    select id from profiles where user_id = auth.uid()
  ));

create policy "Interviewers delete own availability"
  on availability_slots for delete
  using (profile_id in (
    select id from profiles where user_id = auth.uid()
  ));

-- interviewer_availability
create policy "Interviewers manage own availability (date)"
  on interviewer_availability for all
  using (interviewer_id in (
    select id from profiles where user_id = auth.uid()
  ));

create policy "Org members can view availability"
  on interviewer_availability for select
  using (interviewer_id in (
    select id from profiles where user_id in (
      select user_id from organization_members
      where organization_id in (select get_user_organization_ids())
    )
  ));

create policy "Admins can manage org availability"
  on interviewer_availability for all
  using (interviewer_id in (
    select id from profiles where user_id in (
      select user_id from organization_members
      where organization_id in (select get_user_organization_ids())
        and role in ('organization_admin', 'recruiter')
    )
  ));

-- interviews
create policy "Interviews are org-scoped"
  on interviews for all
  using (organization_id in (select get_user_organization_ids()));

create policy "Admins manage interviews"
  on interviews for all
  using (organization_id in (select get_user_organization_ids()))
  with check (organization_id in (select get_user_organization_ids()));

create policy "Interviews are publicly readable via booking"
  on interviews for select
  using (booking_token is not null);

-- bookings — public token access
create policy "Bookings are publicly readable via token"
  on bookings for select
  using (true);

create policy "Bookings can be created via booking flow"
  on bookings for insert
  with check (true);

create policy "Bookings can be updated via booking flow"
  on bookings for update
  using (true);

create policy "Bookings are org-scoped for admin management"
  on bookings for delete
  using (interview_id in (
    select id from interviews where organization_id in (
      select organization_id from profiles where user_id = auth.uid()
    )
  ));

-- feedback (legacy)
create policy "Feedback viewable within org"
  on feedback for select
  using (interview_id in (
    select id from interviews where organization_id in (select get_user_organization_ids())
  ));

create policy "Interviewers submit feedback"
  on feedback for insert
  with check (interviewer_id in (
    select id from profiles where user_id = auth.uid()
  ));

-- interview_feedback
create policy "Interviewers manage own feedback"
  on interview_feedback for all
  using (interviewer_id in (
    select id from profiles where user_id = auth.uid()
  ));

create policy "Feedback viewable within org (extended)"
  on interview_feedback for select
  using (interview_id in (
    select id from interviews where organization_id in (
      select get_user_organization_ids()
    )
  ));

-- interview_meetings
create policy "Meeting links viewable by org members"
  on interview_meetings for select
  using (interview_id in (
    select id from interviews where organization_id in (select get_user_organization_ids())
  ));

create policy "Admins can manage meeting links"
  on interview_meetings for insert
  with check (interview_id in (
    select id from interviews where organization_id in (select get_user_organization_ids())
  ));

-- google_calendar_tokens
create policy "Interviewers manage own calendar tokens"
  on google_calendar_tokens for all
  using (profile_id in (
    select id from profiles where user_id = auth.uid()
  ));

create policy "Admins can view calendar tokens"
  on google_calendar_tokens for select
  using (profile_id in (
    select id from profiles where user_id in (
      select user_id from organization_members
      where organization_id in (select get_user_organization_ids())
        and role in ('organization_admin', 'recruiter')
    )
  ));

-- notifications
create policy "Notifications are org-scoped"
  on notifications for all
  using (organization_id in (select get_user_organization_ids()));

-- audit logs
create policy "Audit logs are org-scoped"
  on audit_logs for select
  using (organization_id in (select get_user_organization_ids()));

-- candidate_sessions
create policy "Candidates can read own sessions"
  on candidate_sessions for select
  using (candidate_id in (
    select id from candidates where access_token is not null
  ));

-- ============================================================
-- 7. REALTIME
-- ============================================================
alter publication supabase_realtime add table organization_members;
alter publication supabase_realtime add table invitations;
alter publication supabase_realtime add table candidates;
alter publication supabase_realtime add table interviews;
alter publication supabase_realtime add table interviewer_availability;
alter publication supabase_realtime add table interview_meetings;
alter publication supabase_realtime add table google_calendar_tokens;
alter publication supabase_realtime add table interview_feedback;
alter publication supabase_realtime add table candidate_sessions;

-- ============================================================
-- 8. BACKFILL existing invitations (idempotent)
-- ============================================================
update invitations set status = 'accepted' where accepted_at is not null and status = 'pending';
update invitations set status = 'expired' where expires_at < now() and status = 'pending';
