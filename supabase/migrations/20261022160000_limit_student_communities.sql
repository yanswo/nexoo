create or replace function public.enforce_one_owned_community()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_role text;
begin
  select role into profile_role from public.profiles where id = new.owner_id;
  if profile_role = 'student' and exists (select 1 from public.communities where owner_id = new.owner_id) then
    raise exception 'student_can_own_one_community';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_one_owned_community on public.communities;
create trigger enforce_one_owned_community
before insert on public.communities
for each row execute function public.enforce_one_owned_community();
