-- Ajuste de preço: todos os sabores de Chopp passam de R$ 12,00 para R$ 10,00.
-- Escrito por setor para pegar qualquer item do setor Chopp (inclusive sabores
-- que venham a ser adicionados depois).

update public.itens i
   set preco = 10.00
  from public.categorias c
  join public.setores s on s.id = c.setor_id
 where i.categoria_id = c.id
   and s.nome = 'Chopp';
