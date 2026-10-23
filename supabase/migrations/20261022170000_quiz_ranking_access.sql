-- Nexo Escolar - acesso seguro ao ranking
-- O ranking usa quiz_attempts; pontos só entram por quiz_answer().
-- Não existe inserção direta de pontos pelo cliente.

alter table public.quiz_attempts enable row level security;

revoke insert, update, delete on public.quiz_attempts from anon, authenticated;
grant select on public.quiz_attempts to authenticated;

drop policy if exists "users can read their own attempt" on public.quiz_attempts;
create policy "users can read their own attempt"
on public.quiz_attempts for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.quiz_leaderboard(max_rows integer default 20)
returns table (
  user_id uuid,
  full_name text,
  score integer,
  correct_count integer,
  total_time_ms bigint,
  finished boolean,
  answered integer,
  total integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.user_id,
    coalesce(nullif(trim(p.full_name), ''), 'Aluno'),
    a.score,
    a.correct_count,
    a.total_time_ms,
    a.finished_at is not null,
    greatest(a.current_ord - 1, 0),
    (select count(*)::integer from public.quiz_questions)
  from public.quiz_attempts a
  join public.profiles p on p.id = a.user_id
  where p.banned_at is null
    and p.role <> 'admin'
  order by a.score desc,
           a.total_time_ms asc,
           coalesce(a.finished_at, now()) asc
  limit least(greatest(coalesce(max_rows, 20), 1), 100);
$$;

revoke execute on function public.quiz_leaderboard(integer) from public, anon;
grant execute on function public.quiz_leaderboard(integer) to authenticated;
