-- Nexo Escolar - moderação (admins, banimento, filtro de palavras e limite de posts)
-- Pode ser executada mais de uma vez. Rode no SQL Editor depois das migrations anteriores.

-- 1) Banimento: guarda quando a conta foi suspensa (null = conta normal).
alter table public.profiles add column if not exists banned_at timestamptz;

-- 2) Funções auxiliares usadas pelas políticas.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and banned_at is null
  );
$$;

create or replace function public.is_banned()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and banned_at is not null
  );
$$;

-- 3) FECHA UMA BRECHA: a política "users can update their own profile" deixava qualquer
--    pessoa logada mudar o próprio papel para admin. Agora só admin (ou o SQL Editor)
--    consegue alterar role e banned_at.
create or replace function public.protect_profile_sensitive_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.banned_at is distinct from old.banned_at)
     and (select auth.uid()) is not null
     and not public.is_admin() then
    raise exception 'Nexo: apenas administradores podem alterar papel ou banimento.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_sensitive on public.profiles;
create trigger profiles_protect_sensitive
before update on public.profiles
for each row execute function public.protect_profile_sensitive_columns();

-- 4) Admin pode apagar qualquer post ou comentário.
drop policy if exists "admins can delete any post" on public.posts;
create policy "admins can delete any post"
on public.posts for delete to authenticated
using (public.is_admin());

drop policy if exists "admins can delete any comment" on public.comments;
create policy "admins can delete any comment"
on public.comments for delete to authenticated
using (public.is_admin());

-- 5) Conta banida não consegue publicar, comentar nem curtir (políticas restritivas somam com as outras).
drop policy if exists "banned users cannot create posts" on public.posts;
create policy "banned users cannot create posts"
on public.posts as restrictive for insert to authenticated
with check (not public.is_banned());

drop policy if exists "banned users cannot create comments" on public.comments;
create policy "banned users cannot create comments"
on public.comments as restrictive for insert to authenticated
with check (not public.is_banned());

drop policy if exists "banned users cannot like posts" on public.post_likes;
create policy "banned users cannot like posts"
on public.post_likes as restrictive for insert to authenticated
with check (not public.is_banned());

-- 6) Ações do painel de moderação. Cada uma confere se quem chamou é admin.
create or replace function public.admin_ban_user(target uuid, delete_content boolean default true)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nexo: apenas administradores podem banir.';
  end if;
  if target = (select auth.uid()) then
    raise exception 'Nexo: você não pode banir a si mesmo.';
  end if;
  if exists (select 1 from public.profiles where id = target and role = 'admin') then
    raise exception 'Nexo: não é possível banir um administrador.';
  end if;

  update public.profiles set banned_at = timezone('utc', now()) where id = target;

  if delete_content then
    delete from public.posts where author_id = target;
    delete from public.comments where author_id = target;
  end if;
end;
$$;

create or replace function public.admin_unban_user(target uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nexo: apenas administradores podem reativar contas.';
  end if;
  update public.profiles set banned_at = null where id = target;
end;
$$;

create or replace function public.admin_set_admin(target uuid, make_admin boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nexo: apenas administradores podem mudar permissões.';
  end if;
  if target = (select auth.uid()) then
    raise exception 'Nexo: você não pode mudar a própria permissão.';
  end if;

  if make_admin then
    update public.profiles set role = 'admin' where id = target and banned_at is null;
  else
    update public.profiles set role = 'student' where id = target and role = 'admin';
  end if;
end;
$$;

revoke execute on function public.admin_ban_user(uuid, boolean) from public, anon;
revoke execute on function public.admin_unban_user(uuid) from public, anon;
revoke execute on function public.admin_set_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_ban_user(uuid, boolean) to authenticated;
grant execute on function public.admin_unban_user(uuid) to authenticated;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;

-- 7) Filtro de palavras + limite de publicações por minuto (valem para posts e comentários).
create table if not exists public.moderation_words (
  word text primary key check (word ~ '^[a-z0-9]{2,}$')
);
alter table public.moderation_words enable row level security;

drop policy if exists "admins manage moderation words" on public.moderation_words;
create policy "admins manage moderation words"
on public.moderation_words for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Palavras sem acento e em minúsculas. Para adicionar mais:
--   insert into public.moderation_words (word) values ('palavra') on conflict do nothing;
insert into public.moderation_words (word) values
  ('porra'), ('caralho'), ('puta'), ('buceta'), ('viado'), ('vadia'),
  ('arrombado'), ('fodase'), ('foder'), ('cuzao'), ('retardado'), ('mongoloide')
on conflict do nothing;

create or replace function public.enforce_content_rules()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  w text;
  recent int;
  txt text;
begin
  -- Admins e o SQL Editor não passam pelo filtro.
  if (select auth.uid()) is null or public.is_admin() then
    return new;
  end if;

  if tg_table_name = 'posts' then
    select count(*) into recent from public.posts
    where author_id = new.author_id and created_at > now() - interval '1 minute';
  else
    select count(*) into recent from public.comments
    where author_id = new.author_id and created_at > now() - interval '1 minute';
  end if;

  if recent >= 5 then
    raise exception 'Nexo: calma! Você está publicando rápido demais. Tente de novo em instantes.';
  end if;

  txt := translate(lower(new.body),
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');

  for w in select word from public.moderation_words loop
    if txt ~ ('\m' || w || '\M') then
      raise exception 'Nexo: sua mensagem tem palavras que não são permitidas aqui.';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists posts_enforce_rules on public.posts;
create trigger posts_enforce_rules
before insert on public.posts
for each row execute function public.enforce_content_rules();

drop trigger if exists comments_enforce_rules on public.comments;
create trigger comments_enforce_rules
before insert on public.comments
for each row execute function public.enforce_content_rules();
