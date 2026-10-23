-- Nexo Escolar - dados de demonstração para desenvolvimento
-- Execute depois da migration inicial.
-- A seed usa o primeiro usuário existente no Auth como autor dos registros.

begin;

do $$
declare
  seed_user uuid;
  seed_community uuid;
  dia date;
begin
  select id
  into seed_user
  from auth.users
  order by created_at asc
  limit 1;

  if seed_user is null then
    raise notice 'Nenhum usuário encontrado em auth.users. Crie uma conta antes de executar a seed.';
    return;
  end if;

  insert into public.profiles (id, full_name, role)
  select
    seed_user,
    coalesce(nullif(trim(raw_user_meta_data ->> 'name'), ''), 'Usuário de teste'),
    'student'
  from auth.users
  where id = seed_user
  on conflict (id) do nothing;

  insert into public.communities (owner_id, name, slug, description, color, visibility)
  values (
    seed_user,
    'Clube de Debates',
    'clube-de-debates',
    'Argumentação, atualidades e encontros semanais para trocar perspectivas.',
    '#ef6f58',
    'school'
  )
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        color = excluded.color,
        visibility = excluded.visibility
  returning id into seed_community;

  if seed_community is null then
    select id
    into seed_community
    from public.communities
    where slug = 'clube-de-debates';
  end if;

  insert into public.community_members (community_id, user_id, role)
  values (seed_community, seed_user, 'owner')
  on conflict (community_id, user_id) do update set role = 'owner';

  insert into public.posts (author_id, community_id, body)
  select seed_user, seed_community, texto
  from (values
    ('Seed de teste: este é o primeiro post real carregado do Supabase.'),
    ('A comunidade já está pronta para receber conversas, projetos e avisos.'),
    ('Próximo passo: trocar as outras telas mockadas por consultas reais.')
  ) as dados(texto)
  where not exists (
    select 1
    from public.posts p
    where p.author_id = seed_user
      and p.community_id = seed_community
      and p.body = dados.texto
  );

  insert into public.events (created_by, community_id, title, description, category, location, starts_at, ends_at)
  select seed_user, seed_community, titulo, descricao, categoria, local_evento,
    now() + deslocamento,
    now() + deslocamento + duracao
  from (values
    ('Debate aberto', 'Roda de conversa para testar o feed e a comunidade.', 'club', 'Biblioteca', interval '1 day', interval '1 hour'),
    ('Feira de Ciências', 'Apresentação dos projetos do bimestre.', 'project', 'Laboratório de Ciências', interval '3 days', interval '2 hours'),
    ('Reunião do Clube de Debates', 'Encontro semanal dos participantes.', 'meeting', 'Sala multiuso', interval '7 days', interval '1 hour')
  ) as dados(titulo, descricao, categoria, local_evento, deslocamento, duracao)
  where not exists (
    select 1
    from public.events e
    where e.created_by = seed_user
      and e.community_id = seed_community
      and e.title = dados.titulo
  );

  -- Grade de aulas: de segunda a sexta, até 20 de dezembro de 2026.
  -- Os eventos são apagados e recriados para que a seed possa ser executada novamente.
  delete from public.events
  where created_by = seed_user
    and title like 'Aula de %'
    and description = 'Aula regular da grade escolar.';

  for dia in
    select data::date
    from generate_series(date '2026-10-26', date '2026-12-20', interval '1 day') as serie(data)
  loop
    if extract(isodow from dia) between 1 and 5 then
      insert into public.events
        (created_by, community_id, title, description, category, location, starts_at, ends_at)
      values
        (seed_user, seed_community, 'Aula de Matemática', 'Aula regular da grade escolar.', 'other', 'Sala 101', timezone('America/Fortaleza', dia + time '08:00'), timezone('America/Fortaleza', dia + time '08:50')),
        (seed_user, seed_community, 'Aula de Língua Portuguesa', 'Aula regular da grade escolar.', 'other', 'Sala 101', timezone('America/Fortaleza', dia + time '09:00'), timezone('America/Fortaleza', dia + time '09:50')),
        (seed_user, seed_community, 'Aula de Ciências', 'Aula regular da grade escolar.', 'other', 'Laboratório de Ciências', timezone('America/Fortaleza', dia + time '10:10'), timezone('America/Fortaleza', dia + time '11:00')),
        (seed_user, seed_community, 'Aula de História', 'Aula regular da grade escolar.', 'other', 'Sala 102', timezone('America/Fortaleza', dia + time '11:10'), timezone('America/Fortaleza', dia + time '12:00')),
        (seed_user, seed_community, 'Aula de Tecnologia', 'Aula regular da grade escolar.', 'other', 'Laboratório de Tecnologia', timezone('America/Fortaleza', dia + time '13:30'), timezone('America/Fortaleza', dia + time '14:20'));
    end if;
  end loop;

  raise notice 'Seed criada para o usuário %.', seed_user;
end;
$$;

commit;
