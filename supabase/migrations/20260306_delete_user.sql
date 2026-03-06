-- Migration to create an RPC for users to delete their own account

create or replace function delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete the user from auth.users
  -- Foreign key constraints in the public schema should automatically cascade
  delete from auth.users where id = auth.uid();
end;
$$;
