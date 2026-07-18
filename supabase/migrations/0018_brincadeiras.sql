-- ================================================================
-- 0018: Adiciona as brincadeiras ao cardápio (categoria Brincadeira).
--   - Touro Mecânico: R$ 12,00 — 3 chances
--   - Espaço Kids:    R$ 20,00 — 15 min
-- A descrição guarda a "unidade" da brincadeira (chances / tempo).
-- Idempotente: pode reaplicar com segurança (usa "where not exists").
-- ================================================================

insert into public.itens (categoria_id, nome, preco, descricao, ordem)
select c.id, v.nome, v.preco, v.descricao, v.ordem
from public.categorias c
cross join (values
  ('Touro Mecânico', 12.00, '3 chances', 1),
  ('Espaço Kids',    20.00, '15 min',    2)
) as v(nome, preco, descricao, ordem)
where c.nome = 'Brincadeira'
  and not exists (
    select 1 from public.itens i where i.categoria_id = c.id and i.nome = v.nome
  );
