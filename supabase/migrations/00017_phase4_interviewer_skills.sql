-- ============================================================
-- Phase 4: Interviewer Skills, Expertise & Intelligent Assignment
-- Additive migration — does not modify or remove existing
-- tables, columns, functions, triggers, or RLS policies.
-- All changes are backwards compatible and idempotent.
-- ============================================================

-- ============================================================
-- 1. Extend profiles with Phase 4 columns
-- ============================================================
alter table profiles
  add column if not exists years_of_experience int,
  add column if not exists primary_expertise text,
  add column if not exists secondary_expertise text,
  add column if not exists preferred_interview_types jsonb default '[]'::jsonb,
  add column if not exists languages_spoken jsonb default '[]'::jsonb,
  add column if not exists max_interviews_per_day int default 3,
  add column if not exists max_interviews_per_week int default 10,
  add column if not exists working_hours jsonb default '{}'::jsonb;

-- ============================================================
-- 2. Update interviewer_skills with new fields
-- ============================================================
alter table interviewer_skills
  add column if not exists skill_name_normalized text,
  add column if not exists last_used date,
  add column if not exists is_primary boolean default false,
  add column if not exists proficiency_scale int check (proficiency_scale >= 1 and proficiency_scale <= 5);

-- Update proficiency to support both old text and new 1-5 scale
alter table interviewer_skills
  alter column proficiency drop not null;

-- ============================================================
-- 3. Create skill_categories table
-- ============================================================
create table if not exists skill_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  description text,
  is_system boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, name)
);

-- ============================================================
-- 4. Create position_skills table
-- ============================================================
create table if not exists position_skills (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references positions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  skill_name text not null,
  skill_name_normalized text,
  importance text not null default 'required' check (importance in ('required', 'preferred')),
  proficiency_required int check (proficiency_required >= 1 and proficiency_required <= 5),
  years_experience_required numeric(4, 1),
  category text,
  created_at timestamptz not null default now(),
  unique(position_id, skill_name)
);

-- ============================================================
-- 5. Enhance interviewer_metrics with additional fields
-- ============================================================
alter table interviewer_metrics
  add column if not exists average_candidate_rating numeric(3, 2) check (average_candidate_rating >= 0 and average_candidate_rating <= 5),
  add column if not exists average_feedback_submission_time numeric(10, 2),
  add column if not exists interview_completion_rate numeric(5, 2) check (interview_completion_rate >= 0 and interview_completion_rate <= 100),
  add column if not exists no_show_rate numeric(5, 2) check (no_show_rate >= 0 and no_show_rate <= 100),
  add column if not exists reschedule_rate numeric(5, 2) check (reschedule_rate >= 0 and reschedule_rate <= 100),
  add column if not exists average_interview_score numeric(3, 2) check (average_interview_score >= 0 and average_interview_score <= 5),
  add column if not exists total_cancelled_interviews int default 0 check (total_cancelled_interviews >= 0),
  add column if not exists total_no_show_interviews int default 0 check (total_no_show_interviews >= 0),
  add column if not exists total_rescheduled_interviews int default 0 check (total_rescheduled_interviews >= 0),
  add column if not exists interviews_today int default 0 check (interviews_today >= 0),
  add column if not exists interviews_this_week int default 0 check (interviews_this_week >= 0),
  add column if not exists interviews_this_month int default 0 check (interviews_this_month >= 0),
  add column if not exists upcoming_interviews int default 0 check (upcoming_interviews >= 0),
  add column if not exists average_duration_minutes numeric(10, 2) check (average_duration_minutes >= 0);

-- Drop the unique constraint on (profile_id, period_start, period_end) if it exists
-- since we want a simpler unique constraint for the new approach
do $$ begin
  alter table interviewer_metrics drop constraint if exists interviewer_metrics_profile_id_period_start_period_end_key;
exception when others then null;
end $$;

-- Add a new simpler unique constraint
do $$ begin
  alter table interviewer_metrics add constraint interviewer_metrics_profile_id_key unique (profile_id);
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 6. Create activity_log for interviewer-specific tracking
-- ============================================================
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  activity_type text not null,
  description text,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. Indexes
-- ============================================================
create index if not exists idx_skill_categories_org on skill_categories(organization_id);
create index if not exists idx_skill_categories_name on skill_categories(name);

create index if not exists idx_position_skills_position on position_skills(position_id);
create index if not exists idx_position_skills_org on position_skills(organization_id);
create index if not exists idx_position_skills_name on position_skills(skill_name);

create index if not exists idx_activity_log_org on activity_log(organization_id);
create index if not exists idx_activity_log_profile on activity_log(profile_id);
create index if not exists idx_activity_log_type on activity_log(activity_type);
create index if not exists idx_activity_log_created on activity_log(created_at);

create index if not exists idx_interviewer_skills_normalized on interviewer_skills(skill_name_normalized);
create index if not exists idx_interviewer_skills_primary on interviewer_skills(profile_id, is_primary) where is_primary = true;

-- ============================================================
-- 8. RLS Policies
-- ============================================================
do $$ begin
  execute 'alter table if exists skill_categories enable row level security';
  execute 'alter table if exists position_skills enable row level security';
  execute 'alter table if exists activity_log enable row level security';
end $$;

-- Skill categories: org-scoped
do $$ begin
  create policy "Skill categories org-scoped select" on skill_categories for select
    using (organization_id is null or organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Skill categories org-scoped insert" on skill_categories for insert
    with check (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Skill categories org-scoped update" on skill_categories for update
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Skill categories org-scoped delete" on skill_categories for delete
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

-- Position skills: org-scoped
do $$ begin
  create policy "Position skills org-scoped select" on position_skills for select
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Position skills org-scoped insert" on position_skills for insert
    with check (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Position skills org-scoped update" on position_skills for update
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Position skills org-scoped delete" on position_skills for delete
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

-- Activity log: org-scoped
do $$ begin
  create policy "Activity log org-scoped select" on activity_log for select
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Activity log org-scoped insert" on activity_log for insert
    with check (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

-- ============================================================
-- 9. Seed default skill categories
-- ============================================================
insert into skill_categories (name, description, is_system) values
  ('Programming Languages', 'General-purpose programming languages', true),
  ('Frontend', 'Frontend web development technologies', true),
  ('Backend', 'Backend web development technologies', true),
  ('Mobile', 'Mobile application development', true),
  ('DevOps', 'DevOps and infrastructure tools', true),
  ('Cloud', 'Cloud platform services', true),
  ('Databases', 'Database systems and technologies', true),
  ('AI/ML', 'Artificial Intelligence and Machine Learning', true),
  ('Testing', 'Software testing and QA', true),
  ('Security', 'Cybersecurity and information security', true),
  ('System Design', 'System architecture and design', true),
  ('Soft Skills', 'Interpersonal and professional skills', true)
on conflict (organization_id, name) do nothing;

-- ============================================================
-- 10. Create function to normalize skill names
-- ============================================================
create or replace function normalize_skill_name(name text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(name, '\s+', ' ', 'g')));
$$;

-- ============================================================
-- 11. Triggers for new tables
-- ============================================================
do $$ begin
  drop trigger if exists update_skill_categories_updated_at on skill_categories;
  create trigger update_skill_categories_updated_at
    before update on skill_categories for each row execute function update_updated_at_column();
exception when others then null; end $$;

do $$ begin
  drop trigger if exists update_position_skills_updated_at on position_skills;
  create trigger update_position_skills_updated_at
    before update on position_skills for each row execute function update_updated_at_column();
exception when others then null; end $$;

-- ============================================================
-- 12. Realtime publication
-- ============================================================
do $$
begin
  perform from pg_publication_tables
    where pubname = 'supabase_realtime'
    and tablename = 'skill_categories';
  if not found then
    alter publication supabase_realtime add table skill_categories;
  end if;
end $$;

do $$
begin
  perform from pg_publication_tables
    where pubname = 'supabase_realtime'
    and tablename = 'position_skills';
  if not found then
    alter publication supabase_realtime add table position_skills;
  end if;
end $$;
