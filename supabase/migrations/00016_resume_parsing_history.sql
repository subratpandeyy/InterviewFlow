-- ============================================================
-- Migration 00016: Resume parsing history & skill confidence
-- Additive migration - does not modify existing tables
-- ============================================================

-- 1. Resume parsing history table
create table if not exists resume_parsing_history (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references resumes(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  parse_version text not null default '1.0',
  status text not null check (status in ('processing', 'completed', 'failed')),
  success boolean not null default false,
  error_message text,
  parse_duration_ms int,
  extracted_skills_count int default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. Add confidence_score to candidate_skills
alter table candidate_skills
  add column if not exists confidence_score numeric(5,2) default 100.00 check (confidence_score >= 0 and confidence_score <= 100);

-- 3. Add extracted_data_source to candidate_skills
alter table candidate_skills
  add column if not exists extracted_data_source text check (extracted_data_source in ('resume_parser', 'ai_enhancement', 'manual'));

-- 4. Add confidence_score to candidate_experience
alter table candidate_experience
  add column if not exists confidence_score numeric(5,2) default 100.00 check (confidence_score >= 0 and confidence_score <= 100);

-- 5. Add extracted_data_source to candidate_experience
alter table candidate_experience
  add column if not exists extracted_data_source text check (extracted_data_source in ('resume_parser', 'ai_enhancement', 'manual'));

-- 6. Add confidence_score to candidate_education
alter table candidate_education
  add column if not exists confidence_score numeric(5,2) default 100.00 check (confidence_score >= 0 and confidence_score <= 100);

-- 7. Add extracted_data_source to candidate_education
alter table candidate_education
  add column if not exists extracted_data_source text check (extracted_data_source in ('resume_parser', 'ai_enhancement', 'manual'));

-- 8. Add confidence_score to candidate_projects
alter table candidate_projects
  add column if not exists confidence_score numeric(5,2) default 100.00 check (confidence_score >= 0 and confidence_score <= 100);

-- 9. Add extracted_data_source to candidate_projects
alter table candidate_projects
  add column if not exists extracted_data_source text check (extracted_data_source in ('resume_parser', 'ai_enhancement', 'manual'));

-- 10. Add confidence_score to candidate_certifications
alter table candidate_certifications
  add column if not exists confidence_score numeric(5,2) default 100.00 check (confidence_score >= 0 and confidence_score <= 100);

-- 11. Add extracted_data_source to candidate_certifications
alter table candidate_certifications
  add column if not exists extracted_data_source text check (extracted_data_source in ('resume_parser', 'ai_enhancement', 'manual'));

-- 12. Add confidence_score to candidate_documents
alter table candidate_documents
  add column if not exists confidence_score numeric(5,2) default 100.00;

-- 13. Add candidate_summary to candidates table for quick view
alter table candidates
  add column if not exists summary jsonb default '{}'::jsonb;

-- 14. Add extended contact fields to candidates (existing fields remain primary)
alter table candidates
  add column if not exists linkedin_url text,
  add column if not exists github_url text,
  add column if not exists portfolio_url text;

-- 15. Add resume intelligence fields to resumes
alter table resumes
  add column if not exists file_size int,
  add column if not exists file_name text,
  add column if not exists mime_type text;

-- 16. Extend notification types for resume parsing events
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('candidate_created','interview_scheduled','interview_rescheduled','interview_cancelled','reminder_24h','reminder_1h','resume_parsed','resume_parsing_failed'));

-- 17. Indexes for performance
create index if not exists idx_resume_parsing_history_resume on resume_parsing_history(resume_id);
create index if not exists idx_resume_parsing_history_candidate on resume_parsing_history(candidate_id);
create index if not exists idx_resume_parsing_history_created on resume_parsing_history(created_at desc);

-- Enable RLS on new table
alter table resume_parsing_history enable row level security;

-- RLS policies for resume_parsing_history (admin bypass available)
create policy "Organization members can view parsing history"
  on resume_parsing_history for select
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid()
    )
  );

create policy "Service role can insert parsing history"
  on resume_parsing_history for insert
  with check (true);
