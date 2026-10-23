-- Nexo Escolar - Desafio de segurança (quiz com timer, pontos e ranking)
-- Regras e respostas ficam no banco. O navegador nunca recebe a resposta certa antes de responder,
-- e o tempo é medido pelo servidor, então mexer no relógio do celular não adianta.
-- Pode ser executada mais de uma vez (as perguntas são atualizadas, as tentativas continuam).
-- Depende da migration de moderação (usa is_admin() e is_banned()).

-- 1) Perguntas. Sem nenhuma policy e sem permissões: ninguém lê direto pela API, nem as respostas certas.
create table if not exists public.quiz_questions (
  id integer generated always as identity primary key,
  ord integer not null unique,
  prompt text not null,
  options jsonb not null
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_index integer not null check (correct_index between 0 and 3),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  time_limit_seconds integer not null default 20 check (time_limit_seconds between 5 and 120),
  explanation text not null default ''
);
alter table public.quiz_questions enable row level security;
revoke all on public.quiz_questions from anon, authenticated;

-- 2) Tentativas: uma por pessoa. A pessoa só L�S a própria; quem escreve são as funções abaixo.
create table if not exists public.quiz_attempts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  current_ord integer not null default 1,
  question_sent_at timestamptz,
  score integer not null default 0,
  correct_count integer not null default 0,
  streak integer not null default 0,
  total_time_ms bigint not null default 0
);
alter table public.quiz_attempts enable row level security;
revoke insert, update, delete on public.quiz_attempts from anon, authenticated;

drop policy if exists "users can read their own attempt" on public.quiz_attempts;
create policy "users can read their own attempt"
on public.quiz_attempts for select to authenticated
using ((select auth.uid()) = user_id);

-- 3) Começar o quiz (uma tentativa por conta).
create or replace function public.quiz_start()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nexo: entre na sua conta para jogar.';
  end if;
  if public.is_banned() then
    raise exception 'Nexo: conta suspensa.';
  end if;
  if not exists (select 1 from public.quiz_questions) then
    raise exception 'Nexo: o quiz ainda não tem perguntas.';
  end if;

  insert into public.quiz_attempts (user_id) values (auth.uid())
  on conflict (user_id) do nothing;
end;
$$;

-- 4) Situação da pessoa: não começou, jogando ou terminou (com a posição no ranking).
create or replace function public.quiz_status()
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  a public.quiz_attempts;
  total_q integer;
  my_rank integer;
begin
  select count(*) into total_q from public.quiz_questions;

  select * into a from public.quiz_attempts where user_id = auth.uid();
  if not found then
    return jsonb_build_object('status', 'not_started', 'total', total_q);
  end if;

  if a.finished_at is null then
    return jsonb_build_object(
      'status', 'in_progress', 'total', total_q,
      'score', a.score, 'answered', a.current_ord - 1
    );
  end if;

  select 1 + count(*) into my_rank
  from public.quiz_attempts b
  join public.profiles p on p.id = b.user_id
  where b.finished_at is not null
    and p.banned_at is null
    and p.role <> 'admin'
    and (
      b.score > a.score
      or (b.score = a.score and b.total_time_ms < a.total_time_ms)
      or (b.score = a.score and b.total_time_ms = a.total_time_ms and b.finished_at < a.finished_at)
    );

  return jsonb_build_object(
    'status', 'finished', 'total', total_q,
    'score', a.score, 'correct_count', a.correct_count, 'rank', my_rank
  );
end;
$$;

-- 5) Entrega a pergunta atual SEM a resposta certa. O relógio começa aqui, no servidor.
--    Se a pessoa atualizar a página, o tempo continua de onde estava (não reinicia).
create or replace function public.quiz_question()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  a public.quiz_attempts;
  q public.quiz_questions;
  total_q integer;
  grace_ms constant integer := 1500;
  limit_ms integer;
  elapsed_ms integer;
begin
  if auth.uid() is null then
    raise exception 'Nexo: entre na sua conta para jogar.';
  end if;
  if public.is_banned() then
    raise exception 'Nexo: conta suspensa.';
  end if;

  select count(*) into total_q from public.quiz_questions;

  loop
    select * into a from public.quiz_attempts where user_id = auth.uid() for update;
    if not found then
      raise exception 'Nexo: comece o quiz primeiro.';
    end if;
    if a.finished_at is not null then
      return jsonb_build_object('status', 'finished');
    end if;

    select * into q from public.quiz_questions where ord = a.current_ord;
    if not found then
      update public.quiz_attempts set finished_at = now() where user_id = auth.uid();
      return jsonb_build_object('status', 'finished');
    end if;

    if a.question_sent_at is null then
      update public.quiz_attempts
      set question_sent_at = clock_timestamp()
      where user_id = auth.uid()
      returning * into a;
    end if;

    limit_ms := q.time_limit_seconds * 1000;
    elapsed_ms := floor(extract(epoch from (clock_timestamp() - a.question_sent_at)) * 1000)::integer;

    if elapsed_ms > limit_ms + grace_ms then
      -- O tempo acabou enquanto a pessoa estava fora: conta como não respondida.
      update public.quiz_attempts
      set current_ord = a.current_ord + 1,
          question_sent_at = null,
          streak = 0,
          total_time_ms = total_time_ms + limit_ms
      where user_id = auth.uid();
      continue;
    end if;

    return jsonb_build_object(
      'status', 'question',
      'position', q.ord,
      'total', total_q,
      'prompt', q.prompt,
      'options', q.options,
      'difficulty', q.difficulty,
      'time_limit_ms', limit_ms,
      'remaining_ms', greatest(0, limit_ms - elapsed_ms),
      'score', a.score,
      'streak', a.streak
    );
  end loop;
end;
$$;

-- 6) Recebe a resposta e calcula os pontos usando o tempo do SERVIDOR.
--    Pontos = base da dificuldade x multiplicador de velocidade (1,0 na hora, 0,5 no último segundo)
--    + bônus de sequência (50 por acerto seguido, até 5).
--    Use choice = -1 para "tempo esgotado".
create or replace function public.quiz_answer(choice integer)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  a public.quiz_attempts;
  q public.quiz_questions;
  grace_ms constant integer := 1500;
  limit_ms integer;
  elapsed_ms integer;
  is_timeout boolean;
  is_correct boolean;
  base_points integer;
  ratio numeric;
  gained integer := 0;
  bonus integer := 0;
  new_streak integer := 0;
  new_score integer;
  is_last boolean;
begin
  if auth.uid() is null then
    raise exception 'Nexo: entre na sua conta para jogar.';
  end if;
  if public.is_banned() then
    raise exception 'Nexo: conta suspensa.';
  end if;

  select * into a from public.quiz_attempts where user_id = auth.uid() for update;
  if not found then
    raise exception 'Nexo: comece o quiz primeiro.';
  end if;
  if a.finished_at is not null then
    raise exception 'Nexo: você já terminou o quiz.';
  end if;
  if a.question_sent_at is null then
    raise exception 'Nexo: essa pergunta ainda não foi exibida.';
  end if;

  select * into q from public.quiz_questions where ord = a.current_ord;
  if not found then
    raise exception 'Nexo: não há mais perguntas.';
  end if;

  limit_ms := q.time_limit_seconds * 1000;
  elapsed_ms := floor(extract(epoch from (clock_timestamp() - a.question_sent_at)) * 1000)::integer;
  is_timeout := elapsed_ms > limit_ms + grace_ms;
  is_correct := (not is_timeout) and choice = q.correct_index;

  if is_correct then
    base_points := case q.difficulty when 'easy' then 500 when 'medium' then 750 else 1000 end;
    ratio := least(1::numeric, greatest(0::numeric, elapsed_ms::numeric / limit_ms));
    gained := round(base_points * (1 - 0.5 * ratio));
    bonus := least(a.streak, 5) * 50;
    gained := gained + bonus;
    new_streak := a.streak + 1;
  end if;

  new_score := a.score + gained;
  is_last := not exists (select 1 from public.quiz_questions where ord > a.current_ord);

  update public.quiz_attempts
  set score = new_score,
      correct_count = correct_count + case when is_correct then 1 else 0 end,
      streak = new_streak,
      total_time_ms = total_time_ms + least(elapsed_ms, limit_ms),
      current_ord = current_ord + 1,
      question_sent_at = null,
      finished_at = case when is_last then now() else null end
  where user_id = auth.uid();

  return jsonb_build_object(
    'correct', is_correct,
    'timed_out', is_timeout,
    'points', gained,
    'bonus', bonus,
    'correct_index', q.correct_index,
    'explanation', q.explanation,
    'score', new_score,
    'streak', new_streak,
    'finished', is_last,
    'elapsed_ms', least(elapsed_ms, limit_ms)
  );
end;
$$;

-- 7) Ranking (sem admins e sem contas banidas). Desempate: menor tempo total, depois quem terminou antes.
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
security definer set search_path = public
as $$
  select
    a.user_id,
    coalesce(nullif(trim(p.full_name), ''), 'Aluno'),
    a.score,
    a.correct_count,
    a.total_time_ms,
    a.finished_at is not null,
    a.current_ord - 1,
    (select count(*)::integer from public.quiz_questions)
  from public.quiz_attempts a
  join public.profiles p on p.id = a.user_id
  where p.banned_at is null and p.role <> 'admin'
  order by a.score desc, a.total_time_ms asc, coalesce(a.finished_at, now()) asc
  limit least(greatest(max_rows, 1), 100);
$$;

-- 8) Zerar o quiz (use depois dos testes, antes da apresentação). Só admin.
create or replace function public.admin_reset_quiz()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nexo: apenas administradores podem zerar o quiz.';
  end if;
  delete from public.quiz_attempts where true;
end;
$$;

revoke execute on function public.quiz_start() from public, anon;
revoke execute on function public.quiz_status() from public, anon;
revoke execute on function public.quiz_question() from public, anon;
revoke execute on function public.quiz_answer(integer) from public, anon;
revoke execute on function public.quiz_leaderboard(integer) from public, anon;
revoke execute on function public.admin_reset_quiz() from public, anon;
grant execute on function public.quiz_start() to authenticated;
grant execute on function public.quiz_status() to authenticated;
grant execute on function public.quiz_question() to authenticated;
grant execute on function public.quiz_answer(integer) to authenticated;
grant execute on function public.quiz_leaderboard(integer) to authenticated;
grant execute on function public.admin_reset_quiz() to authenticated;

-- 9) Perguntas. Para trocar ou adicionar, edite este bloco e rode de novo.
--    Campos: ordem, enunciado, 4 alternativas, índice da certa (0 a 3), dificuldade, segundos, explicação.
insert into public.quiz_questions (ord, prompt, options, correct_index, difficulty, time_limit_seconds, explanation)
values
  (1, 'O que é phishing?', '["Um vírus que apaga seus arquivos", "Um golpe que usa mensagens falsas para roubar seus dados", "Uma técnica de pescaria esportiva", "Um app que acelera o celular"]'::jsonb, 1, 'easy', 15, 'Phishing é a isca: mensagem falsa que imita uma empresa ou pessoa para você entregar senhas, códigos ou dinheiro.'),
  (2, 'Qual destas senhas é a mais segura?', '["12345678", "nome do seu cachorro", "bolo-violeta-trem-72", "sua data de nascimento"]'::jsonb, 2, 'easy', 15, 'Senhas longas, com palavras aleatórias e números, são difíceis de adivinhar e fáceis de lembrar.'),
  (3, 'Alguém te manda mensagem pedindo o código que chegou por SMS no seu celular. O que fazer?', '["Passar rápido, o pedido parece urgente", "Passar só os 3 primeiros dígitos", "Passar se a pessoa for educada", "Nunca passar: o código é a chave da sua conta"]'::jsonb, 3, 'easy', 15, 'Quem pede o código quer entrar na sua conta. Nenhuma empresa séria pede esse código.'),
  (4, 'O que é um vazamento de dados?', '["Quando um site sai do ar", "Quando alguém apaga a própria conta", "Quando informações pessoais ficam expostas a quem não deveria ter acesso", "Quando o celular fica sem sinal"]'::jsonb, 2, 'easy', 15, 'Em um vazamento, dados como e-mails, senhas e documentos acabam nas mãos de terceiros.'),
  (5, 'O que é a verificação em duas etapas (2FA)?', '["Uma segunda prova de que é você, além da senha", "Digitar a senha duas vezes", "Ter duas contas no mesmo site", "Trocar a senha duas vezes por ano"]'::jsonb, 0, 'easy', 15, 'Mesmo que roubem sua senha, sem a segunda etapa o golpista não consegue entrar.'),
  (6, 'Qual é o sinal mais forte de que um e-mail pode ser phishing?', '["O e-mail tem o logo da empresa", "Pede dados com urgência e traz link para um endereço estranho", "O e-mail foi enviado de manhã", "O e-mail é longo"]'::jsonb, 1, 'medium', 20, 'Urgência somada a um link suspeito é a combinação clássica do golpe. Logo qualquer um copia.'),
  (7, 'O cadeado (HTTPS) ao lado do endereço de um site significa que:', '["O site é 100% confiável", "O site não tem anúncios", "A conexão é criptografada, mas o site ainda pode ser um golpe", "O site é do governo"]'::jsonb, 2, 'medium', 20, 'O cadeado protege a viagem dos dados, mas não prova que o site é honesto. Golpistas também usam HTTPS.'),
  (8, 'Por que é perigoso usar a mesma senha em vários sites?', '["Deixa o site mais lento", "O navegador bloqueia a conta", "Não é perigoso", "Se um site vazar, golpistas testam a mesma senha nos outros"]'::jsonb, 3, 'medium', 20, 'Golpistas testam senhas vazadas em vários serviços. Uma senha para cada conta limita o estrago.'),
  (9, 'Uma mensagem traz o link banco-seguro.com.co/login e diz que sua conta será bloqueada. O melhor a fazer é:', '["Clicar rápido, antes que bloqueie", "Responder pedindo mais informações", "Abrir o app oficial ou digitar o endereço do banco por conta própria", "Encaminhar para os amigos"]'::jsonb, 2, 'medium', 20, 'Nunca use o link da mensagem. Entre pelo app oficial ou digitando o endereço você mesmo.'),
  (10, 'Qual lei brasileira trata da proteção dos dados pessoais?', '["Lei Rouanet", "LGPD (Lei Geral de Proteção de Dados)", "CLT", "Lei do Inquilinato"]'::jsonb, 1, 'medium', 20, 'A LGPD define como empresas e órgãos podem coletar, usar e guardar seus dados, e garante direitos a você.'),
  (11, 'O que é engenharia social?', '["Um curso de tecnologia da informação", "Um programa que quebra senhas sozinho", "Uma técnica de criptografia", "Manipular pessoas, com confiança, medo ou pressa, para conseguir dados ou acesso"]'::jsonb, 3, 'hard', 25, '�? o golpe que ataca a pessoa, não a máquina: o criminoso convence você a abrir a porta.'),
  (12, 'O que torna o ransomware tão perigoso?', '["Faz o computador esquentar", "Sequestra seus arquivos (criptografa) e exige pagamento", "Só afeta celulares", "Apaga só os cookies do navegador"]'::jsonb, 1, 'hard', 25, 'O ransomware trava seus arquivos e cobra resgate. Backup e atualizações são a melhor defesa.'),
  (13, 'A checagem de senhas vazadas do Nexo usa só os 5 primeiros caracteres do hash da senha. Por quê?', '["Para economizar internet", "Porque o hash só tem 5 caracteres", "Para o serviço nunca receber a senha inteira", "Para a checagem ficar mais lenta"]'::jsonb, 2, 'hard', 25, 'Com só um pedacinho do hash, o serviço devolve uma lista de candidatas e a conferência final acontece aqui, sem expor a senha.'),
  (14, 'Você acha um pen drive no estacionamento da escola. O mais seguro é:', '["Plugar no computador da escola para descobrir de quem é", "Formatar e usar normalmente", "Plugar só em um computador antigo", "Entregar na direção, sem plugar em nada"]'::jsonb, 3, 'hard', 25, 'Pen drives achados podem ter programas maliciosos que rodam sozinhos ao conectar. Golpistas deixam de propósito.'),
  (15, 'Alguém clona seu chip e passa a receber seus SMS. Qual proteção resiste melhor a esse golpe?', '["Código de verificação por SMS", "Perguntas de segurança", "App autenticador ou chave de segurança", "Uma senha curta, mas secreta"]'::jsonb, 2, 'hard', 25, 'O código por SMS depende do chip. Um app autenticador ou chave de segurança fica no seu aparelho.')
on conflict (ord) do update set
  prompt = excluded.prompt,
  options = excluded.options,
  correct_index = excluded.correct_index,
  difficulty = excluded.difficulty,
  time_limit_seconds = excluded.time_limit_seconds,
  explanation = excluded.explanation;


