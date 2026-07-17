-- Corrige o dia do faturamento: antes agrupava por date_trunc('day', pago_em)
-- no fuso do servidor (UTC), jogando os pedidos da noite (após 21h em SP) para
-- o dia seguinte e deslocando o "hoje". Agora agrupa pela DATA em America/Sao_Paulo.
--
-- O tipo da coluna `dia` muda (timestamptz -> date), então precisa DROP + CREATE.

drop view if exists public.faturamento_dia;
create view public.faturamento_dia as
select
  (pago_em at time zone 'America/Sao_Paulo')::date as dia,
  count(*)                                         as pedidos_pagos,
  sum(total)                                       as faturamento,
  avg(total)                                       as ticket_medio
from public.pedidos
where status_pagto = 'pago'
group by 1
order by 1 desc;

drop view if exists public.faturamento_setor_dia;
create view public.faturamento_setor_dia as
select
  (p.pago_em at time zone 'America/Sao_Paulo')::date as dia,
  s.id                                               as setor_id,
  s.nome                                             as setor,
  count(ps.*)                                        as sub_pedidos,
  sum(ps.subtotal)                                   as faturamento
from public.pedido_setores ps
join public.pedidos p on p.id = ps.pedido_id
join public.setores s on s.id = ps.setor_id
where p.status_pagto = 'pago'
group by 1, 2, 3
order by 1 desc, 4 desc;

-- Regrant (o drop remove os privilégios)
grant select on public.faturamento_dia       to authenticated;
grant select on public.faturamento_setor_dia to authenticated;
