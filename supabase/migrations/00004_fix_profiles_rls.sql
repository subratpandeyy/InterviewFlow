-- Ensure profiles have a "Users can view own profile" policy
-- This may have been lost during the get_user_organization_ids() cascade drop.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles'
    and policyname = 'Users can view own profile'
  ) then
    create policy "Users can view own profile"
      on profiles for select
      using (user_id = auth.uid());
  end if;
end $$;
