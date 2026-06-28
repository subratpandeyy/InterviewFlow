-- Fix RLS recursion on profiles table.
-- PostgreSQL evaluates ALL policies at plan time. Even though the non-recursive
-- "Users can view own profile" policy matches, the recursive "Profiles are viewable
-- within organization" policy causes a planner error ("infinite recursion detected").
--
-- Solution: use a security definer function to look up the user's org IDs,
-- bypassing RLS and breaking the recursion chain.

-- Security definer function: returns the organization_id(s) for the current user.
-- Runs as the function owner (superuser), bypassing RLS on profiles.
create or replace function get_user_organization_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id from profiles where user_id = auth.uid();
$$;

-- Drop the recursive policy
drop policy if exists "Profiles are viewable within organization" on profiles;

-- Recreate using the non-recursive function
create policy "Profiles are viewable within organization"
  on profiles for select
  using (organization_id in (select get_user_organization_ids()));
