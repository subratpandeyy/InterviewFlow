-- Availability-Based Interview Scheduling System
-- Adds date-based interviewer availability, meeting link management,
-- double-booking prevention, and Realtime subscriptions.

-- ============================================================
-- INTERVIEWER AVAILABILITY (date-specific slots)
-- ============================================================

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

create index if not exists idx_interviewer_availability_lookup
  on interviewer_availability(interviewer_id, date, status);

-- ============================================================
-- INTERVIEW MEETINGS (provider + link per interview)
-- ============================================================

alter table interviews add column if not exists meeting_provider text
  check (meeting_provider in ('google_meet', 'zoom', 'microsoft_teams', 'custom'));

create table if not exists interview_meetings (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  provider text not null check (provider in ('google_meet', 'zoom', 'microsoft_teams', 'custom')),
  meeting_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_interview_meetings_interview
  on interview_meetings(interview_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table interviewer_availability enable row level security;
alter table interview_meetings enable row level security;

-- Interviewer availability: interviewer manages own
create policy "Interviewers manage own availability"
  on interviewer_availability for all
  using (interviewer_id in (
    select id from profiles where user_id = auth.uid()
  ));

-- Org members (recruiters, admins) can view availability
create policy "Org members can view availability"
  on interviewer_availability for select
  using (interviewer_id in (
    select id from profiles where user_id in (
      select user_id from organization_members
      where organization_id in (select get_user_organization_ids())
    )
  ));

-- Admins can manage any availability in their org
-- (needed for admin dashboard to block/edit slots)
create policy "Admins can manage org availability"
  on interviewer_availability for all
  using (interviewer_id in (
    select id from profiles where user_id in (
      select user_id from organization_members
      where organization_id in (select get_user_organization_ids())
        and role in ('organization_admin', 'recruiter')
    )
  ));

-- Meeting links: interview participants (anyone in org) can view
create policy "Meeting links viewable by org members"
  on interview_meetings for select
  using (interview_id in (
    select id from interviews
    where organization_id in (select get_user_organization_ids())
  ));

-- Admins/recruiters can create/update meeting links
create policy "Admins can manage meeting links"
  on interview_meetings for insert
  with check (interview_id in (
    select id from interviews
    where organization_id in (select get_user_organization_ids())
  ));

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table interviewer_availability;
alter publication supabase_realtime add table interview_meetings;

-- ============================================================
-- HELPER FUNCTION: check for overlapping available slots
-- ============================================================

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

-- ============================================================
-- HELPER FUNCTION: get available slots for an interviewer on a date
-- ============================================================

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
-- TRIGGER: auto-update updated_at on interviewer_availability
-- ============================================================

drop trigger if exists update_interviewer_availability_updated_at on interviewer_availability;
create trigger update_interviewer_availability_updated_at
  before update on interviewer_availability
  for each row execute function update_updated_at_column();
