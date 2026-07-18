-- ================================================================
-- 0017: Atualização do cardápio conforme foto do cardápio 2026.
--   - Nova barraca "Almoço" e categorias "Assados" (barraca Churrasco)
--     e "Almoço" (barraca Almoço).
--   - Novos produtos em Quermesse(Salgados)/Doces/Assados/Almoço.
--   - Sabores (marca) em Cerveja e Refrigerante — só exibição/esgotar;
--     a ficha continua genérica porque o pedido não captura variação.
--   - Corrige preço da Pururuca (8 -> 10).
--   - Remove itens de outra festa (oculta os já pedidos, deleta o resto).
-- Idempotente: pode reaplicar com segurança (usa "where not exists").
-- ================================================================

-- ---------- Nova barraca (setor) Almoço ----------
insert into public.setores (nome, prefixo_senha, cor, ordem)
select 'Almoço', 'A', '#7D5BA6', 7
where not exists (select 1 from public.setores where nome = 'Almoço');

-- ---------- Novas categorias ----------
insert into public.categorias (nome, ordem, setor_id)
select 'Assados', 3, (select id from public.setores where nome = 'Churrasco')
where not exists (select 1 from public.categorias where nome = 'Assados');

insert into public.categorias (nome, ordem, setor_id)
select 'Almoço', 4, (select id from public.setores where nome = 'Almoço')
where not exists (select 1 from public.categorias where nome = 'Almoço');

-- Reordena as categorias existentes para caber Assados(3) e Almoço(4).
update public.categorias set ordem = 5 where nome = 'Doces';
update public.categorias set ordem = 6 where nome = 'Chopp';
update public.categorias set ordem = 7 where nome = 'Cervejas e Refrigerantes';
update public.categorias set ordem = 8 where nome = 'Brincadeira';

-- ---------- Novos itens: Quermesse (categoria Salgados) ----------
insert into public.itens (categoria_id, nome, preco, ordem)
select c.id, v.nome, v.preco, v.ordem
from public.categorias c
cross join (values
  ('Tiras de Pastel (porção)', 10.00, 9),
  ('Caldo de Mandioca',        12.00, 10),
  ('Espetinho de Frango',      15.00, 11),
  ('Frango à Passarinho',      20.00, 12)
) as v(nome, preco, ordem)
where c.nome = 'Salgados'
  and not exists (
    select 1 from public.itens i where i.categoria_id = c.id and i.nome = v.nome
  );

-- ---------- Novos itens: Doces (sem sabor) ----------
insert into public.itens (categoria_id, nome, preco, ordem)
select c.id, v.nome, v.preco, v.ordem
from public.categorias c
cross join (values
  ('Bombom de Morango', 14.00, 3),
  ('Sorvete de Palito',  2.00, 4),
  ('Sorvete de Pote',    6.00, 5)
) as v(nome, preco, ordem)
where c.nome = 'Doces'
  and not exists (
    select 1 from public.itens i where i.categoria_id = c.id and i.nome = v.nome
  );

-- ---------- Novos itens: Assados (barraca Churrasco) ----------
insert into public.itens (categoria_id, nome, preco, descricao, ordem)
select c.id, v.nome, v.preco, v.descricao, v.ordem
from public.categorias c
cross join (values
  ('Fraldinha 300g',   30.00, 'Com patê de alho e pão', 1),
  ('Frango - metade',  30.00, null,                     2),
  ('Frango - inteiro', 50.00, null,                     3),
  ('Leitoa - 1/2 kilo',40.00, null,                     4),
  ('Leitoa - por kilo',80.00, null,                     5),
  ('Cabeça de Leitoa', 40.00, 'Recheada com farofa',    6)
) as v(nome, preco, descricao, ordem)
where c.nome = 'Assados'
  and not exists (
    select 1 from public.itens i where i.categoria_id = c.id and i.nome = v.nome
  );

-- ---------- Novos itens: Almoço (barraca Almoço) ----------
insert into public.itens (categoria_id, nome, preco, descricao, ordem)
select c.id, v.nome, v.preco, v.descricao, v.ordem
from public.categorias c
cross join (values
  ('Arroz Branco',              6.00, null::text,               1),
  ('Espaguete ao Sugo',        10.00, null,                     2),
  ('Maionese',                 12.00, null,                     3),
  ('Fraldinha 300g',           30.00, 'Com patê de alho e pão', 4),
  ('1/2 Frango Assado',        30.00, null,                     5),
  ('Frango Inteiro Assado',    50.00, null,                     6),
  ('Leitoa Assada 1/2 kilo',   40.00, null,                     7),
  ('Leitoa Assada por kilo',   80.00, null,                     8),
  ('Cabeça de Leitoa',         40.00, 'Recheada com farofa',    9)
) as v(nome, preco, descricao, ordem)
where c.nome = 'Almoço'
  and not exists (
    select 1 from public.itens i where i.categoria_id = c.id and i.nome = v.nome
  );

-- ---------- Sabores (marca) em Cerveja e Refrigerante ----------
-- Só exibição + esgotar por marca. A ficha continua genérica (o pedido não
-- captura variação — o cliente escolhe a marca na barraca).
insert into public.item_variacoes (item_id, nome, ordem)
select i.id, v.nome, v.ordem
from public.itens i
join public.categorias c on c.id = i.categoria_id
cross join (values ('Brahma', 1), ('Amstel', 2), ('Império', 3)) as v(nome, ordem)
where c.nome = 'Cervejas e Refrigerantes' and i.nome = 'Cerveja'
  and not exists (
    select 1 from public.item_variacoes iv where iv.item_id = i.id and iv.nome = v.nome
  );

insert into public.item_variacoes (item_id, nome, ordem)
select i.id, v.nome, v.ordem
from public.itens i
join public.categorias c on c.id = i.categoria_id
cross join (values ('Coca-Cola', 1), ('Guaraná', 2)) as v(nome, ordem)
where c.nome = 'Cervejas e Refrigerantes' and i.nome = 'Refrigerante'
  and not exists (
    select 1 from public.item_variacoes iv where iv.item_id = i.id and iv.nome = v.nome
  );

-- ---------- Corrige preço da Pururuca ----------
update public.itens set preco = 10.00 where nome = 'Pururuca';

-- ---------- Remove itens de outra festa ----------
-- Oculta todos (somem do cardápio mesmo se já foram pedidos)...
update public.itens set disponivel = false
 where nome in (
   'Milho-Verde', 'Cachorro-Quente', 'Lanche de Pernil', 'Quentão', 'Vinho Quente'
 );

-- ...e deleta de vez os que nunca foram pedidos (os pedidos travam o delete por FK).
delete from public.itens i
 where i.nome in (
   'Milho-Verde', 'Cachorro-Quente', 'Lanche de Pernil', 'Quentão', 'Vinho Quente'
 )
 and not exists (select 1 from public.pedido_itens pi where pi.item_id = i.id);
