-- Ancoragem de preço: coluna preco_de guarda o preço de referência mostrado
-- riscado ao lado do preço atual. NULL = sem promoção. A UI (ItemCard) só
-- exibe a âncora + selo "PROMOÇÃO" quando preco_de > preco. O preço cobrado
-- continua sendo `preco` — criar_pedido não usa preco_de.

alter table public.itens
  add column if not exists preco_de numeric(10,2)
    check (preco_de is null or preco_de >= 0);

-- Marca os 3 sabores de Chopp como promoção: de R$ 12 por R$ 10.
update public.itens i
   set preco_de = 12.00
  from public.categorias c
  join public.setores s on s.id = c.setor_id
 where i.categoria_id = c.id
   and s.nome = 'Chopp';
