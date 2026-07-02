-- RLS do cardápio + setores. Público lê tudo; admin escreve; cozinha alterna disponibilidade.

alter table public.setores           enable row level security;
alter table public.categorias        enable row level security;
alter table public.itens             enable row level security;
alter table public.item_variacoes    enable row level security;

-- Leitura pública (anon) — cardápio precisa carregar sem login
create policy "setores_public_read"    on public.setores        for select using (ativo);
create policy "categorias_public_read" on public.categorias     for select using (true);
create policy "itens_public_read"      on public.itens          for select using (true);
create policy "variacoes_public_read"  on public.item_variacoes for select using (true);

-- Admin gerencia catálogo por completo
create policy "setores_admin_all" on public.setores
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

create policy "categorias_admin_all" on public.categorias
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

create policy "itens_admin_all" on public.itens
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

create policy "variacoes_admin_all" on public.item_variacoes
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

-- Cozinha alterna disponibilidade (esgotar sabor / pausar item) — só update
create policy "itens_cozinha_toggle" on public.itens
  for update using (public.papel_atual() = 'cozinha') with check (public.papel_atual() = 'cozinha');

create policy "variacoes_cozinha_toggle" on public.item_variacoes
  for update using (public.papel_atual() = 'cozinha') with check (public.papel_atual() = 'cozinha');
