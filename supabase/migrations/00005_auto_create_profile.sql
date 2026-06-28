-- Auto-create profile row when a new auth user is created.
-- This is the safety net that prevents orphaned auth users
-- (users in auth.users with no corresponding profiles row).
--
-- The function reads full_name from raw_user_meta_data (set by the
-- server action via createUser's user_metadata) and falls back to the
-- email local-part if metadata is absent.
--
-- "on conflict do nothing" makes it harmless if the server action's
-- own profile insert runs first (race between trigger and action).

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
