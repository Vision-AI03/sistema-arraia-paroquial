-- Realtime nas tabelas que Cozinha, Admin e Checkout do cliente escutam.
alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.pedido_setores;
alter publication supabase_realtime add table public.pedido_itens;
alter publication supabase_realtime add table public.itens;
alter publication supabase_realtime add table public.item_variacoes;

-- Faturamento consolidado do dia (apenas pedidos pagos)
create or replace view public.faturamento_dia as
select
  date_trunc('day', pago_em)  as dia,
  count(*)                    as pedidos_pagos,
  sum(total)                  as faturamento,
  avg(total)                  as ticket_medio
from public.pedidos
where status_pagto = 'pago'
group by 1
order by 1 desc;

-- Faturamento por setor no dia (o que cada barraca produziu)
create or replace view public.faturamento_setor_dia as
select
  date_trunc('day', p.pago_em) as dia,
  s.id                          as setor_id,
  s.nome                        as setor,
  count(ps.*)                   as sub_pedidos,
  sum(ps.subtotal)              as faturamento
from public.pedido_setores ps
join public.pedidos p on p.id = ps.pedido_id
join public.setores s on s.id = ps.setor_id
where p.status_pagto = 'pago'
group by 1, 2, 3
order by 1 desc, 4 desc;

-- Top itens vendidos nos últimos 7 dias
create or replace view public.top_itens_7d as
select
  pi.item_id,
  pi.nome_snapshot                         as nome,
  s.nome                                   as setor,
  sum(pi.quantidade)                       as qtd_vendida,
  sum(pi.quantidade * pi.preco_unitario)   as receita
from public.pedido_itens pi
join public.pedido_setores ps on ps.id = pi.pedido_setor_id
join public.pedidos p on p.id = ps.pedido_id
join public.setores s on s.id = ps.setor_id
where p.status_pagto = 'pago'
  and p.pago_em >= now() - interval '7 days'
group by pi.item_id, pi.nome_snapshot, s.nome
order by qtd_vendida desc;
