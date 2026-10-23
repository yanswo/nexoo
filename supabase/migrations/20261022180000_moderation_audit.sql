-- Nexo Escolar - auditoria simples de moderacao
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc', now()),
  moderator_id uuid not null references public.profiles (id) on delete restrict,
  action text not null check (char_length(trim(action)) between 1 and 160)
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

drop policy if exists "admins can read audit logs" on public.audit_logs;
create policy "admins can read audit logs"
on public.audit_logs for select
to authenticated
using (public.is_admin());

create or replace function public.admin_log_audit(action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nexo: apenas administradores podem registrar auditoria.';
  end if;
  if action is null or char_length(trim(action)) = 0 then
    raise exception 'Nexo: acao de auditoria invalida.';
  end if;

  insert into public.audit_logs (moderator_id, action)
  values (auth.uid(), left(trim(action), 160));
end;
$$;

revoke execute on function public.admin_log_audit(text) from public, anon;
grant execute on function public.admin_log_audit(text) to authenticated;
