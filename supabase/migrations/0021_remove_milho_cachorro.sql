-- Remove do cardápio os itens Cachorro-Quente e Milho-Verde (adicionados por
-- engano). Eles estavam referenciados apenas por PEDIDOS DE TESTE anteriores ao
-- início da festa (19/07): dois de 10/07 e um de 17/07 (sem nome, QR simulado).
--
-- Passo 1 apaga esses pedidos de teste — o ON DELETE CASCADE de pedido_setores
-- e pedido_itens remove os sub-pedidos/itens junto, liberando a FK.
-- Passo 2 deleta os dois itens do cardápio.
-- Numa base nova esses UUIDs não existem, então os deletes viram no-op.

delete from public.pedidos
 where id in (
   '9a87cc47-bcae-4131-b8d9-3006e1dcac9f',  -- teste 10/07 (pendente)
   '8ad616be-e294-4eff-b611-0f7687fb87b6',  -- teste 10/07 (pago simulado)
   '2e8d89d5-200b-4e08-97c3-5fb2dcac7d1f'   -- teste 17/07 (pendente)
 );

delete from public.itens
 where id in (
   '7818eeb0-4aaa-4db6-a8a5-50da9044874d',  -- Cachorro-Quente
   '6723e7d0-c829-4e2a-b763-b43b6b4c817e'   -- Milho-Verde
 );
