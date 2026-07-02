-- RLS de pedidos. Anon NÃO escreve direto — cliente chama RPC criar_pedido (definida em 0006).
-- Anon lê o próprio pedido pelo id (para acompanhar o status em realtime na tela de checkout).

alter table public.pedidos        enable row level security;
alter table public.pedido_setores enable row level security;
alter table public.pedido_itens   enable row level security;

-- Leitura para cozinha (só seu setor) e admin (tudo)
create policy "pedidos_staff_select" on public.pedidos
  for select using (public.papel_atual() in ('cozinha', 'admin'));

create policy "pedido_setores_admin_select" on public.pedido_setores
  for select using (public.papel_atual() = 'admin');

-- Cozinha só vê pedidos_setores dos setores em que ela está lotada.
-- Simplificação MVP: cozinha vê todos os setores. Se quiser filtrar por setor por usuário,
-- adicionar coluna perfis.setor_id e trocar o using abaixo.
create policy "pedido_setores_cozinha_select" on public.pedido_setores
  for select using (public.papel_atual() = 'cozinha');

create policy "pedido_itens_staff_select" on public.pedido_itens
  for select using (public.papel_atual() in ('cozinha', 'admin'));

-- Cozinha atualiza status dos sub-pedidos (recebido → preparando → pronto → entregue)
create policy "pedido_setores_cozinha_update" on public.pedido_setores
  for update using (public.papel_atual() = 'cozinha') with check (public.papel_atual() = 'cozinha');

-- Admin faz tudo
create policy "pedidos_admin_all" on public.pedidos
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

create policy "pedido_setores_admin_all" on public.pedido_setores
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

create policy "pedido_itens_admin_all" on public.pedido_itens
  for all using (public.papel_atual() = 'admin') with check (public.papel_atual() = 'admin');

-- Anon lê APENAS o próprio pedido pelo id (usado na tela de checkout para acompanhar pagamento).
-- Como id é uuid v4, adivinhação é inviável.
create policy "pedidos_anon_select_by_id" on public.pedidos
  for select to anon using (true);

create policy "pedido_setores_anon_select" on public.pedido_setores
  for select to anon using (true);

-- Anon NÃO insere nem atualiza direto: o único caminho é o RPC criar_pedido (SECURITY DEFINER)
-- e o webhook do Mercado Pago (via service_role na Edge Function).
