-- ============================================================
-- Phase 1: Database Foundation
-- Additive migration — does not modify or remove existing
-- tables, columns, functions, triggers, or RLS policies.
-- All changes are backwards compatible and idempotent.
-- ============================================================

-- ============================================================
-- 1. Extend Existing Tables (additive, nullable columns only)
-- ============================================================

-- profiles
alter table profiles
  add column if not exists department text,
  add column if not exists role_title text,
  add column if not exists timezone text,
  add column if not exists seniority text,
  add column if not exists bio text,
  add column if not exists phone text,
  add column if not exists weekly_interview_limit int;

-- candidates
alter table candidates
  add column if not exists current_company text,
  add column if not exists current_title text,
  add column if not exists source text,
  add column if not exists source_detail text,
  add column if not exists salary_expectation numeric(10, 2),
  add column if not exists availability_date date,
  add column if not exists referred_by uuid references profiles(id) on delete set null,
  add column if not exists preferred_timezone text,
  add column if not exists tags jsonb default '[]'::jsonb;

-- positions
alter table positions
  add column if not exists salary_range_min numeric(10, 2),
  add column if not exists salary_range_max numeric(10, 2),
  add column if not exists currency text default 'USD',
  add column if not exists priority text check (priority in ('low', 'medium', 'high', 'critical')),
  add column if not exists hiring_manager_id uuid references profiles(id) on delete set null,
  add column if not exists recruiter_id uuid references profiles(id) on delete set null,
  add column if not exists interview_plan jsonb default '[]'::jsonb,
  add column if not exists target_start_date date,
  add column if not exists openings_count int default 1 check (openings_count > 0),
  add column if not exists filled_count int default 0 check (filled_count >= 0);

-- interviews
alter table interviews
  add column if not exists timezone text,
  add column if not exists candidate_confirmed_at timestamptz,
  add column if not exists interviewer_confirmed_at timestamptz,
  add column if not exists rescheduled_from uuid references interviews(id) on delete set null,
  add column if not exists ai_suggested_interviewer uuid references profiles(id) on delete set null,
  add column if not exists ai_match_score numeric(5, 2) check (ai_match_score >= 0 and ai_match_score <= 100),
  add column if not exists preparation_notes text,
  add column if not exists round_number int default 1 check (round_number > 0),
  add column if not exists total_rounds int default 1 check (total_rounds > 0);

-- interview_feedback
alter table interview_feedback
  add column if not exists skills_assessed jsonb default '[]'::jsonb,
  add column if not exists ai_summary text,
  add column if not exists submitted_at timestamptz;

-- organizations
alter table organizations
  add column if not exists logo_url text,
  add column if not exists brand_color text,
  add column if not exists email_branding jsonb default '{}'::jsonb,
  add column if not exists settings jsonb default '{}'::jsonb,
  add column if not exists plan_tier text default 'free' check (plan_tier in ('free', 'starter', 'professional', 'enterprise')),
  add column if not exists features jsonb default '{}'::jsonb;

-- google_calendar_tokens
alter table google_calendar_tokens
  add column if not exists calendar_name text,
  add column if not exists calendar_timezone text;


-- ============================================================
-- 2. Create New Tables
-- ============================================================

-- 2a. resumes
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  file_url text,
  file_type text,
  parsed_text text,
  parsed_data jsonb default '{}'::jsonb,
  parsing_status text not null default 'pending' check (parsing_status in ('pending', 'processing', 'completed', 'failed')),
  parsing_error text,
  parsed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2b. candidate_skills
create table if not exists candidate_skills (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  skill_name text not null,
  category text,
  proficiency text check (proficiency in ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience numeric(4, 1),
  is_verified boolean default false,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(candidate_id, skill_name)
);

-- 2c. candidate_experience
create table if not exists candidate_experience (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  company text not null,
  title text not null,
  location text,
  start_date date,
  end_date date,
  is_current boolean default false,
  description text,
  achievements jsonb default '[]'::jsonb,
  skills_used text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2d. candidate_education
create table if not exists candidate_education (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  is_current boolean default false,
  grade text,
  activities text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2e. candidate_projects
create table if not exists candidate_projects (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  url text,
  technologies text[],
  start_date date,
  end_date date,
  is_current boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2f. candidate_certifications
create table if not exists candidate_certifications (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  issuer text,
  issue_date date,
  expiry_date date,
  credential_id text,
  credential_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2g. candidate_documents
create table if not exists candidate_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  file_name text,
  file_size int,
  mime_type text,
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2h. candidate_notes
create table if not exists candidate_notes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  content text not null,
  note_type text default 'general' check (note_type in ('general', 'feedback', 'summary', 'action_item')),
  is_pinned boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2i. candidate_status_history
create table if not exists candidate_status_history (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references profiles(id) on delete set null,
  change_reason text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2j. interviewer_skills
create table if not exists interviewer_skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  skill_name text not null,
  category text,
  proficiency text check (proficiency in ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience numeric(4, 1),
  is_core boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, skill_name)
);

-- 2k. interviewer_metrics
create table if not exists interviewer_metrics (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  total_interviews int not null default 0 check (total_interviews >= 0),
  completed_interviews int not null default 0 check (completed_interviews >= 0),
  average_rating numeric(3, 2) check (average_rating >= 0 and average_rating <= 5),
  feedback_completion_rate numeric(5, 2) check (feedback_completion_rate >= 0 and feedback_completion_rate <= 100),
  on_time_percentage numeric(5, 2) check (on_time_percentage >= 0 and on_time_percentage <= 100),
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, period_start, period_end)
);

-- 2l. interviewer_departments
create table if not exists interviewer_departments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  department text not null,
  is_primary boolean default false,
  created_at timestamptz not null default now(),
  unique(profile_id, department)
);

-- 2m. interview_skills
create table if not exists interview_skills (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  skill_name text not null,
  required_proficiency text check (required_proficiency in ('beginner', 'intermediate', 'advanced', 'expert')),
  weight numeric(3, 2) default 1.0 check (weight > 0 and weight <= 10),
  created_at timestamptz not null default now(),
  unique(interview_id, skill_name)
);

-- 2n. email_templates
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  template_type text not null check (template_type in (
    'booking', 'confirmation', 'reminder', 'cancellation',
    'invitation', 'otp', 'feedback_request', 'offer', 'rejection',
    'custom'
  )),
  subject text not null,
  body text not null,
  variables jsonb default '[]'::jsonb,
  is_default boolean default false,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, template_type, name)
);

-- 2o. email_logs
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  template_id uuid references email_templates(id) on delete set null,
  recipient_email text not null,
  recipient_id uuid,
  subject text not null,
  body text,
  status text not null default 'sent' check (status in ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  error_message text,
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

-- 2p. analytics_events
create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  event_name text not null,
  entity_type text,
  entity_id uuid,
  actor_id uuid,
  metadata jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- 2q. analytics_dashboards
create table if not exists analytics_dashboards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  is_default boolean default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2r. interview_rounds
create table if not exists interview_rounds (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  round_number int not null check (round_number > 0),
  round_type text not null,
  interviewer_id uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'completed', 'cancelled', 'no_show')),
  scheduled_at timestamptz,
  duration_minutes int check (duration_minutes > 0),
  feedback_id uuid references interview_feedback(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(interview_id, round_number)
);

-- 2s. suggested_interviewers
create table if not exists suggested_interviewers (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  match_score numeric(5, 2) check (match_score >= 0 and match_score <= 100),
  match_reasons jsonb default '[]'::jsonb,
  skill_overlap jsonb default '{}'::jsonb,
  is_selected boolean default false,
  created_at timestamptz not null default now(),
  unique(interview_id, profile_id)
);


-- ============================================================
-- 3. Indexes
-- ============================================================

-- Resumes
create index if not exists idx_resumes_candidate on resumes(candidate_id);
create index if not exists idx_resumes_organization on resumes(organization_id);
create index if not exists idx_resumes_parsing_status on resumes(parsing_status);

-- Candidate Skills
create index if not exists idx_candidate_skills_candidate on candidate_skills(candidate_id);
create index if not exists idx_candidate_skills_organization on candidate_skills(organization_id);
create index if not exists idx_candidate_skills_name on candidate_skills(skill_name);
create index if not exists idx_candidate_skills_category on candidate_skills(category);

-- Candidate Experience
create index if not exists idx_candidate_experience_candidate on candidate_experience(candidate_id);
create index if not exists idx_candidate_experience_organization on candidate_experience(organization_id);

-- Candidate Education
create index if not exists idx_candidate_education_candidate on candidate_education(candidate_id);
create index if not exists idx_candidate_education_organization on candidate_education(organization_id);

-- Candidate Projects
create index if not exists idx_candidate_projects_candidate on candidate_projects(candidate_id);

-- Candidate Certifications
create index if not exists idx_candidate_certifications_candidate on candidate_certifications(candidate_id);

-- Candidate Documents
create index if not exists idx_candidate_documents_candidate on candidate_documents(candidate_id);
create index if not exists idx_candidate_documents_type on candidate_documents(document_type);

-- Candidate Notes
create index if not exists idx_candidate_notes_candidate on candidate_notes(candidate_id);
create index if not exists idx_candidate_notes_author on candidate_notes(author_id);

-- Candidate Status History
create index if not exists idx_candidate_status_history_candidate on candidate_status_history(candidate_id);
create index if not exists idx_candidate_status_history_org on candidate_status_history(organization_id);
create index if not exists idx_candidate_status_history_status on candidate_status_history(new_status);

-- Interviewer Skills
create index if not exists idx_interviewer_skills_profile on interviewer_skills(profile_id);
create index if not exists idx_interviewer_skills_organization on interviewer_skills(organization_id);
create index if not exists idx_interviewer_skills_name on interviewer_skills(skill_name);
create index if not exists idx_interviewer_skills_category on interviewer_skills(category);

-- Interviewer Metrics
create index if not exists idx_interviewer_metrics_profile on interviewer_metrics(profile_id);
create index if not exists idx_interviewer_metrics_org on interviewer_metrics(organization_id);

-- Interviewer Departments
create index if not exists idx_interviewer_departments_profile on interviewer_departments(profile_id);
create index if not exists idx_interviewer_departments_org on interviewer_departments(organization_id);
create index if not exists idx_interviewer_departments_dept on interviewer_departments(department);

-- Interview Skills
create index if not exists idx_interview_skills_interview on interview_skills(interview_id);
create index if not exists idx_interview_skills_org on interview_skills(organization_id);
create index if not exists idx_interview_skills_name on interview_skills(skill_name);

-- Email Templates
create index if not exists idx_email_templates_org on email_templates(organization_id);
create index if not exists idx_email_templates_type on email_templates(template_type);

-- Email Logs
create index if not exists idx_email_logs_org on email_logs(organization_id);
create index if not exists idx_email_logs_recipient on email_logs(recipient_email);
create index if not exists idx_email_logs_status on email_logs(status);
create index if not exists idx_email_logs_sent_at on email_logs(sent_at);

-- Analytics Events
create index if not exists idx_analytics_events_org on analytics_events(organization_id);
create index if not exists idx_analytics_events_type on analytics_events(event_type);
create index if not exists idx_analytics_events_name on analytics_events(event_name);
create index if not exists idx_analytics_events_entity on analytics_events(entity_type, entity_id);
create index if not exists idx_analytics_events_occurred on analytics_events(occurred_at);

-- Analytics Dashboards
create index if not exists idx_analytics_dashboards_org on analytics_dashboards(organization_id);

-- Interview Rounds
create index if not exists idx_interview_rounds_interview on interview_rounds(interview_id);
create index if not exists idx_interview_rounds_org on interview_rounds(organization_id);
create index if not exists idx_interview_rounds_interviewer on interview_rounds(interviewer_id);
create index if not exists idx_interview_rounds_status on interview_rounds(status);

-- Suggested Interviewers
create index if not exists idx_suggested_interviewers_interview on suggested_interviewers(interview_id);
create index if not exists idx_suggested_interviewers_org on suggested_interviewers(organization_id);
create index if not exists idx_suggested_interviewers_profile on suggested_interviewers(profile_id);
create index if not exists idx_suggested_interviewers_score on suggested_interviewers(match_score);

-- Candidates (new columns)
create index if not exists idx_candidates_source on candidates(source);
create index if not exists idx_candidates_current_company on candidates(current_company);
create index if not exists idx_candidates_tags on candidates using gin(tags);
create index if not exists idx_candidates_position_applied on candidates(position_applied);


-- ============================================================
-- 4. RLS Policies
-- ============================================================

-- Enable RLS on all new tables
do $$ begin
  execute 'alter table if exists resumes enable row level security';
  execute 'alter table if exists candidate_skills enable row level security';
  execute 'alter table if exists candidate_experience enable row level security';
  execute 'alter table if exists candidate_education enable row level security';
  execute 'alter table if exists candidate_projects enable row level security';
  execute 'alter table if exists candidate_certifications enable row level security';
  execute 'alter table if exists candidate_documents enable row level security';
  execute 'alter table if exists candidate_notes enable row level security';
  execute 'alter table if exists candidate_status_history enable row level security';
  execute 'alter table if exists interviewer_skills enable row level security';
  execute 'alter table if exists interviewer_metrics enable row level security';
  execute 'alter table if exists interviewer_departments enable row level security';
  execute 'alter table if exists interview_skills enable row level security';
  execute 'alter table if exists email_templates enable row level security';
  execute 'alter table if exists email_logs enable row level security';
  execute 'alter table if exists analytics_events enable row level security';
  execute 'alter table if exists analytics_dashboards enable row level security';
  execute 'alter table if exists interview_rounds enable row level security';
  execute 'alter table if exists suggested_interviewers enable row level security';
end $$;

-- Organization-scoped access policy (reusable pattern)
-- Uses existing get_user_organization_ids() helper function.
-- Note: PG 18 does not support CREATE POLICY IF NOT EXISTS, so we use
-- exception-safe DO blocks instead.

do $$ begin
  create policy "Org-scoped select access" on resumes for select
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Org-scoped insert access" on resumes for insert
    with check (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Org-scoped update access" on resumes for update
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Org-scoped delete access" on resumes for delete
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null;
end $$;

-- Generate org-scoped RLS policies for all remaining new tables.
do $$
declare
  t text;
  tables text[] := array[
    'candidate_skills', 'candidate_experience', 'candidate_education',
    'candidate_projects', 'candidate_certifications', 'candidate_documents',
    'candidate_notes', 'candidate_status_history',
    'interviewer_skills', 'interviewer_metrics', 'interviewer_departments',
    'interview_skills',
    'analytics_events', 'analytics_dashboards',
    'interview_rounds', 'suggested_interviewers'
  ];
begin
  foreach t in array tables loop
    begin
      execute format('create policy "Org-scoped select access" on %I for select using (organization_id in (select get_user_organization_ids()))', t);
    exception when duplicate_object then null; end;
    begin
      execute format('create policy "Org-scoped insert access" on %I for insert with check (organization_id in (select get_user_organization_ids()))', t);
    exception when duplicate_object then null; end;
    begin
      execute format('create policy "Org-scoped update access" on %I for update using (organization_id in (select get_user_organization_ids()))', t);
    exception when duplicate_object then null; end;
    begin
      execute format('create policy "Org-scoped delete access" on %I for delete using (organization_id in (select get_user_organization_ids()))', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

-- Email templates: org-scoped but system defaults (null organization_id) are readable by all
do $$ begin
  create policy "Email templates select" on email_templates for select
    using (organization_id is null or organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Email templates insert" on email_templates for insert
    with check (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Email templates update" on email_templates for update
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Email templates delete" on email_templates for delete
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

-- Email logs: org-scoped for reading, insert via application (org members)
do $$ begin
  create policy "Email logs select" on email_logs for select
    using (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Email logs insert" on email_logs for insert
    with check (organization_id in (select get_user_organization_ids()));
exception when duplicate_object then null; end; $$;

-- Resumes need additional candidate-scoped read for candidate portal
do $$ begin
  create policy "Resumes candidate read own" on resumes for select
    using (
      candidate_id in (
        select id from candidates
        where id = resumes.candidate_id
          and access_token is not null
          and access_token_expires_at > now()
          and email_verified_at is not null
      )
    );
exception when duplicate_object then null; end; $$;

-- Fix candidate RLS: Replace broad USING(true) policies with token-verified ones.
drop policy if exists "Candidates can read own record via token" on candidates;
drop policy if exists "Candidates can update own resume" on candidates;

do $$ begin
  create policy "Candidates can read own record via token"
    on candidates for select
    using (
      access_token is not null
      and access_token_expires_at > now()
      and deleted_at is null
      and email_verified_at is not null
    );
exception when duplicate_object then null; end; $$;

do $$ begin
  create policy "Candidates can update own resume"
    on candidates for update
    using (
      access_token is not null
      and access_token_expires_at > now()
      and deleted_at is null
      and email_verified_at is not null
    )
    with check (
      access_token is not null
      and access_token_expires_at > now()
      and deleted_at is null
      and email_verified_at is not null
    );
exception when duplicate_object then null; end; $$;


-- ============================================================
-- 5. Triggers (reuse existing update_updated_at_column)
-- ============================================================

-- The update_updated_at_column() function was created in migration 00012.
-- It is not recreated here to avoid overriding any future changes.

do $$
declare
  t text;
  tables_with_updated_at text[] := array[
    'resumes', 'candidate_skills', 'candidate_experience', 'candidate_education',
    'candidate_projects', 'candidate_certifications', 'candidate_notes',
    'interviewer_skills', 'interviewer_metrics', 'interviewer_departments',
    'interview_skills', 'email_templates', 'analytics_dashboards',
    'interview_rounds', 'suggested_interviewers'
  ];
begin
  foreach t in array tables_with_updated_at loop
    execute format(
      'drop trigger if exists update_%I_updated_at on %I',
      t, t
    );
    execute format(
      'create trigger update_%I_updated_at before update on %I for each row execute function update_updated_at_column()',
      t, t
    );
  end loop;
end $$;


-- ============================================================
-- 6. Constraints
-- ============================================================
-- PG 18 does not support ALTER TABLE ADD CONSTRAINT IF NOT EXISTS,
-- so we use exception-safe DO blocks.

do $$ begin
  alter table candidates add constraint candidates_tags_is_array check (jsonb_typeof(tags) = 'array');
exception when duplicate_object then null; end; $$;

do $$ begin
  alter table candidates add constraint candidates_salary_expectation_positive check (salary_expectation is null or salary_expectation >= 0);
exception when duplicate_object then null; end; $$;

do $$ begin
  alter table positions add constraint positions_salary_range_min_positive check (salary_range_min is null or salary_range_min >= 0);
exception when duplicate_object then null; end; $$;

do $$ begin
  alter table positions add constraint positions_salary_range_max_positive check (salary_range_max is null or salary_range_max >= 0);
exception when duplicate_object then null; end; $$;

do $$ begin
  alter table positions add constraint positions_salary_range_order check (salary_range_min is null or salary_range_max is null or salary_range_min <= salary_range_max);
exception when duplicate_object then null; end; $$;

do $$ begin
  alter table candidate_status_history add constraint chk_candidate_status_history_new_status check (new_status in ('applied', 'screening', 'scheduled', 'interviewed', 'selected', 'rejected'));
exception when duplicate_object then null; end; $$;

do $$ begin
  alter table interview_rounds add constraint chk_interview_rounds_round_type check (round_type in ('hr', 'technical', 'managerial', 'final', 'take_home', 'phone_screen', 'group', 'custom'));
exception when duplicate_object then null; end; $$;

do $$ begin
  alter table candidate_documents add constraint unique_candidate_document_type_per_candidate unique (candidate_id, document_type, file_url);
exception when duplicate_object then null; end; $$;

do $$ begin
  alter table positions add constraint positions_filled_not_exceed_openings check (filled_count <= openings_count);
exception when duplicate_object then null; end; $$;


-- ============================================================
-- 7. Seed Data: Email Templates (system defaults)
-- ============================================================

-- System default templates have null organization_id so they apply globally
-- and are readable by all orgs. Organizations can override by creating
-- their own template with the same template_type.

insert into email_templates (template_type, name, subject, body, variables, is_default, is_active) values
-- Booking link
('booking', 'Default Booking Link',
  '{{candidate_name}}, schedule your interview with {{organization_name}}',
  '<h1>Hello {{candidate_name}},</h1><p>You have been invited to interview for the position of <strong>{{position_title}}</strong> at {{organization_name}}.</p><p>Please use the link below to select a time that works for you:</p><p><a href="{{booking_link}}" style="display:inline-block;padding:12px 24px;background-color:#0070f3;color:#fff;text-decoration:none;border-radius:6px;">Schedule Your Interview</a></p><p>This link expires on {{expires_at}}.</p>',
  '["candidate_name", "organization_name", "position_title", "booking_link", "expires_at"]'::jsonb,
  true, true),

-- Confirmation
('confirmation', 'Default Confirmation',
  'Interview Confirmed – {{organization_name}}',
  '<h1>Interview Confirmed</h1><p>Hi {{candidate_name}},</p><p>Your interview for <strong>{{position_title}}</strong> has been confirmed.</p><p><strong>Date &amp; Time:</strong> {{scheduled_at}}</p><p><strong>Interviewer:</strong> {{interviewer_name}}</p>{{#if meeting_link}}<p><strong>Meeting Link:</strong> <a href="{{meeting_link}}">{{meeting_link}}</a></p>{{/if}}<p>Please keep this information safe.</p>',
  '["candidate_name", "organization_name", "position_title", "scheduled_at", "interviewer_name", "meeting_link"]'::jsonb,
  true, true),

-- Reminder (24h)
('reminder', 'Default 24h Reminder',
  'Reminder: Your interview is tomorrow – {{organization_name}}',
  '<h1>Interview Reminder</h1><p>Hi {{candidate_name}},</p><p>This is a reminder that your interview for <strong>{{position_title}}</strong> is scheduled for <strong>{{scheduled_at}}</strong>.</p>{{#if meeting_link}}<p><strong>Meeting Link:</strong> <a href="{{meeting_link}}">{{meeting_link}}</a></p>{{/if}}<p>Please ensure you have a stable internet connection and a quiet environment.</p><p>Good luck!</p>',
  '["candidate_name", "organization_name", "position_title", "scheduled_at", "meeting_link"]'::jsonb,
  true, true),

-- Cancellation
('cancellation', 'Default Cancellation',
  'Interview Cancelled – {{organization_name}}',
  '<h1>Interview Cancelled</h1><p>Hi {{candidate_name}},</p><p>Your interview for <strong>{{position_title}}</strong> at {{organization_name}} has been cancelled.</p>{{#if reason}}<p><strong>Reason:</strong> {{reason}}</p>{{/if}}<p>We apologize for any inconvenience. A team member will reach out with next steps.</p>',
  '["candidate_name", "organization_name", "position_title", "reason"]'::jsonb,
  true, true),

-- Invitation (team member)
('invitation', 'Default Team Invitation',
  'You''ve been invited to join {{organization_name}} on InterviewFlow',
  '<h1>Welcome to InterviewFlow</h1><p>Hi there,</p><p>You have been invited to join <strong>{{organization_name}}</strong> as a <strong>{{role}}</strong>.</p><p>Click the link below to accept the invitation and set up your account:</p><p><a href="{{invitation_link}}" style="display:inline-block;padding:12px 24px;background-color:#0070f3;color:#fff;text-decoration:none;border-radius:6px;">Accept Invitation</a></p><p>This invitation expires on {{expires_at}}.</p>',
  '["organization_name", "role", "invitation_link", "expires_at"]'::jsonb,
  true, true),

-- OTP
('otp', 'Default OTP',
  'Your verification code – InterviewFlow',
  '<h1>Verification Code</h1><p>Hi {{candidate_name}},</p><p>Your verification code is:</p><p style="font-size:32px;font-weight:bold;letter-spacing:4px;text-align:center;padding:16px;background:#f5f5f5;border-radius:8px;">{{otp_code}}</p><p>This code expires in 10 minutes. Please do not share it with anyone.</p>',
  '["candidate_name", "otp_code"]'::jsonb,
  true, true)

on conflict (organization_id, template_type, name) do nothing;


-- ============================================================
-- 8. Realtime Publication
-- ============================================================

-- Add new tables to the existing replication publication
-- Using alter publication add table rather than dropping/creating
-- to avoid disrupting existing subscriptions.
do $$
declare
  t text;
  tables_to_add text[] := array[
    'resumes', 'candidate_skills', 'candidate_experience', 'candidate_education',
    'candidate_projects', 'candidate_certifications', 'candidate_documents',
    'candidate_notes', 'candidate_status_history',
    'interviewer_skills', 'interviewer_metrics', 'interviewer_departments',
    'interview_skills', 'email_templates', 'email_logs',
    'analytics_events', 'analytics_dashboards',
    'interview_rounds', 'suggested_interviewers'
  ];
begin
  foreach t in array tables_to_add loop
    execute format(
      'alter publication supabase_realtime add table %I',
      t
    );
  end loop;
exception when others then
  -- Publication may not exist in all environments
  null;
end $$;
