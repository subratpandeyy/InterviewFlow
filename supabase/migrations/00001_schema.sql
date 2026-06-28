-- InterviewFlow MVP Schema
-- Corrected for Supabase PostgreSQL compatibility
--
-- Incompatibilities fixed:
--   1. REMOVED: create trigger if not exists (PostgreSQL does not support this)
--      REPLACED WITH: drop trigger if exists + create trigger (standard PG pattern)
--   2. REMOVED: uuid_generate_v4() (fails due to uuid-ossp search_path)
--      REPLACED WITH: gen_random_uuid() (built-in PG 13+, always available)
--   3. REMOVED: create extension "uuid-ossp" (not needed with gen_random_uuid)
--   4. CHANGED: profiles.user_id foreign key on delete cascade -> set null
--      (prevents cascading data loss when auth user is deleted)
--   5. REMOVED: handle_new_user() trigger on auth.users (was a no-op)

-- ============================================================
-- TABLES
-- ============================================================

-- === ORGANIZATIONS ===
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === PROFILES (users) ===
-- user_id references auth.users with on delete set null.
-- If a Supabase auth user is deleted, the profile's user_id becomes null
-- but the profile row and its audit trail remain intact.
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  organization_id uuid not null references organizations(id) on delete cascade,
  role text not null check (role in ('admin', 'recruiter', 'interviewer')),
  full_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === CANDIDATES ===
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === POSITIONS ===
create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  department text not null,
  experience_required text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === AVAILABILITY SLOTS (interviewer working hours) ===
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

-- === INTERVIEWS ===
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
  calendar_event_id text,
  status text not null default 'pending' check (status in ('pending','scheduled','completed','cancelled','no_show')),
  notes text,
  booking_token text unique,
  booking_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === BOOKINGS ===
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  token text unique not null,
  status text not null default 'pending' check (status in ('pending','booked','cancelled','expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === FEEDBACK ===
-- Intentionally no updated_at column: feedback is write-once.
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

-- === NOTIFICATIONS ===
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

-- === AUDIT LOGS ===
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

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_profiles_user_id on profiles(user_id);
create index if not exists idx_profiles_organization_id on profiles(organization_id);
create index if not exists idx_candidates_organization_id on candidates(organization_id);
create index if not exists idx_positions_organization_id on positions(organization_id);
create index if not exists idx_interviews_organization_id on interviews(organization_id);
create index if not exists idx_interviews_candidate_id on interviews(candidate_id);
create index if not exists idx_interviews_interviewer_id on interviews(interviewer_id);
create index if not exists idx_interviews_booking_token on interviews(booking_token) where booking_token is not null;
create index if not exists idx_availability_slots_profile_id on availability_slots(profile_id);
create index if not exists idx_bookings_token on bookings(token);
create index if not exists idx_bookings_interview_id on bookings(interview_id);
create index if not exists idx_feedback_interview_id on feedback(interview_id);
create index if not exists idx_notifications_recipient_id on notifications(recipient_id);
create index if not exists idx_notifications_organization_id on notifications(organization_id);
create index if not exists idx_audit_logs_organization_id on audit_logs(organization_id);
create index if not exists idx_audit_logs_entity_type on audit_logs(entity_type);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table candidates enable row level security;
alter table positions enable row level security;
alter table availability_slots enable row level security;
alter table interviews enable row level security;
alter table bookings enable row level security;
alter table feedback enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- Organization isolation: users see only their own org
create policy "Users can view their own organization"
  on organizations for select
  using (id in (
    select organization_id from profiles where user_id = auth.uid()
  ));

-- Profiles
-- Non-recursive policy: users can always read their own profile.
-- This is required to break the recursion in org-scoped policies below.
create policy "Users can view own profile"
  on profiles for select
  using (user_id = auth.uid());

create policy "Profiles are viewable within organization"
  on profiles for select
  using (organization_id in (
    select organization_id from profiles where user_id = auth.uid()
  ));

create policy "Users can update own profile"
  on profiles for update
  using (user_id = auth.uid());

-- Candidates
create policy "Candidates are org-scoped"
  on candidates for all
  using (organization_id in (
    select organization_id from profiles where user_id = auth.uid()
  ));

-- Positions
create policy "Positions are org-scoped"
  on positions for all
  using (organization_id in (
    select organization_id from profiles where user_id = auth.uid()
  ));

-- Availability
create policy "Availability viewable within org"
  on availability_slots for select
  using (profile_id in (
    select id from profiles where organization_id in (
      select organization_id from profiles where user_id = auth.uid()
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

-- Interviews
create policy "Interviews are org-scoped"
  on interviews for all
  using (organization_id in (
    select organization_id from profiles where user_id = auth.uid()
  ));

-- Bookings: public token access + org-scoped admin
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

-- Feedback
create policy "Feedback viewable within org"
  on feedback for select
  using (interview_id in (
    select id from interviews where organization_id in (
      select organization_id from profiles where user_id = auth.uid()
    )
  ));

create policy "Interviewers submit feedback"
  on feedback for insert
  with check (interviewer_id in (
    select id from profiles where user_id = auth.uid()
  ));

-- Notifications
create policy "Notifications are org-scoped"
  on notifications for all
  using (organization_id in (
    select organization_id from profiles where user_id = auth.uid()
  ));

-- Audit logs
create policy "Audit logs are org-scoped"
  on audit_logs for select
  using (organization_id in (
    select organization_id from profiles where user_id = auth.uid()
  ));

-- ============================================================
-- TRIGGER FUNCTION: auto-update updated_at
-- ============================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- TRIGGERS
-- NOTE: PostgreSQL does NOT support CREATE TRIGGER IF NOT EXISTS.
-- Instead we use DROP TRIGGER IF EXISTS + CREATE TRIGGER.
-- This pattern is idempotent and safe to run multiple times.
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
