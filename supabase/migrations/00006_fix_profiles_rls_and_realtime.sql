-- Fix profiles RLS: org-scoped viewing via organization_members join
-- The "Profiles are viewable within organization" policy was dropped in
-- migration 00003 but never recreated. Without it, users can only see
-- their own profile (the "Users can view own profile" policy), which
-- breaks any query that fetches other users' profiles (e.g. interviewer
-- dropdowns, admin member lists).

drop policy if exists "Profiles are viewable within organization" on profiles;
create policy "Profiles are viewable within organization"
  on profiles for select
  using (user_id in (
    select user_id from organization_members
    where organization_id in (select get_user_organization_ids())
  ));

-- ============================================================
-- ENABLE REALTIME FOR DASHBOARD TABLES
-- ============================================================

alter publication supabase_realtime add table organization_members;
alter publication supabase_realtime add table invitations;
alter publication supabase_realtime add table candidates;
alter publication supabase_realtime add table interviews;
