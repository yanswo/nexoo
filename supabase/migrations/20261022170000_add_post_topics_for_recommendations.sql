alter table public.posts
  add column if not exists topic text not null default 'Geral';

alter table public.posts
  add constraint posts_topic_length check (char_length(trim(topic)) between 2 and 40);

create index if not exists posts_topic_idx on public.posts (topic);
