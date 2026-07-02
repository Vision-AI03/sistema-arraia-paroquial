-- Perfis de usuário: liga auth.users a um papel (cozinha/admin).
-- Cliente NÃO precisa de conta: acessa via token da mesa.

create type public.papel_usuario as enum ('cozinha', 'admin');

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel public.papel_usuario not null,
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Cada usuário lê o próprio perfil (para o front descobrir o papel após login)
create policy "perfis_self_select"
  on public.perfis for select
  using (auth.uid() = id);

-- Helper: papel do usuário atual (usado nas policies das outras tabelas)
create or replace function public.papel_atual()
returns public.papel_usuario
language sql stable security definer set search_path = public
as $$
  select papel from public.perfis where id = auth.uid()
$$;

-- Trigger opcional: cria perfil vazio ao criar usuário (o admin ajusta o papel depois)
-- Comentado: mantemos criação manual via SQL/dashboard para evitar auto-provisionamento.
