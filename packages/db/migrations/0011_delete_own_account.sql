-- BiteJoy schema, migration 0011: self-service full account deletion.
--
-- `UserRepository.deleteAllUserData` (application-level, via the user's
-- own scoped client) removes profile/preferences/saved-restaurants/
-- activity rows but leaves the underlying `auth.users` identity intact -
-- useful as a generic repository operation, but not a full "delete my
-- account". This RPC goes further: it removes the `auth.users` row
-- itself, which cascades through `profiles` -> `user_preferences` /
-- `saved_restaurants` / `user_activity` (all `on delete cascade`, see
-- 0003/0004/0010), so nothing needs deleting explicitly beyond that one
-- row.
--
-- `security definer` is required because a plain `authenticated` role
-- cannot delete from `auth.users` directly - but the hardcoded `where id =
-- auth.uid()` means it can only ever delete the CALLER's own account.
-- This keeps full account deletion available from `apps/web` without ever
-- using the service-role key in a request-handling path.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
