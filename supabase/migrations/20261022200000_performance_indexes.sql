-- Índices para as consultas de interesses e atividades do perfil.
-- As chaves primárias já cobrem as buscas por post_id, mas não por usuário.

create index if not exists post_likes_user_id_idx
  on public.post_likes (user_id);

create index if not exists saved_items_user_id_created_at_idx
  on public.saved_items (user_id, created_at desc);

create index if not exists comments_author_id_created_at_idx
  on public.comments (author_id, created_at desc);
