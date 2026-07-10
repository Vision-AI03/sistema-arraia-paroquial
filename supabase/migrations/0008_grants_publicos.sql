-- GRANTs explícitos: nas versões novas do Supabase, tabelas NÃO ganham privilégio
-- automático para os roles anon/authenticated. RLS controla *linhas*, mas ainda
-- precisa de GRANT no nível da tabela.
--
-- Idempotente: GRANT é seguro rodar múltiplas vezes.

-- ----- Cardápio: leitura pública -----
grant select on public.setores        to anon, authenticated;
grant select on public.categorias     to anon, authenticated;
grant select on public.itens          to anon, authenticated;
grant select on public.item_variacoes to anon, authenticated;

-- Cozinha alterna disponibilidade (RLS filtra)
grant update on public.itens          to authenticated;
grant update on public.item_variacoes to authenticated;

-- Admin faz tudo (RLS filtra)
grant insert, update, delete on public.setores        to authenticated;
grant insert, update, delete on public.categorias     to authenticated;
grant insert, update, delete on public.itens          to authenticated;
grant insert, update, delete on public.item_variacoes to authenticated;

-- ----- Pedidos: anon lê o próprio, staff opera -----
grant select on public.pedidos        to anon, authenticated;
grant select on public.pedido_setores to anon, authenticated;
grant select on public.pedido_itens   to anon, authenticated;

grant insert, update, delete on public.pedidos        to authenticated;
grant insert, update, delete on public.pedido_setores to authenticated;
grant insert, update, delete on public.pedido_itens   to authenticated;

-- ----- Perfis: usuário lê o próprio -----
grant select on public.perfis to authenticated;

-- ----- RPCs -----
-- criar_pedido é SECURITY DEFINER, mas o role ainda precisa poder EXECUTAR.
grant execute on function public.criar_pedido(jsonb)              to anon, authenticated;
grant execute on function public.iniciar_cobranca_simulada(uuid)  to anon, authenticated;
grant execute on function public.simular_pagamento(uuid)          to anon, authenticated;
grant execute on function public.papel_atual()                    to authenticated;

-- ----- Views de faturamento (apenas admin lê via RLS das tabelas base) -----
grant select on public.faturamento_dia       to authenticated;
grant select on public.faturamento_setor_dia to authenticated;
grant select on public.top_itens_7d          to authenticated;
