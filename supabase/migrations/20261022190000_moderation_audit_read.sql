-- Corrige a permissão de leitura do painel de auditoria.
-- A policy limita a leitura a admins; este GRANT habilita a consulta autenticada.
grant select on public.audit_logs to authenticated;
