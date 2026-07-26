-- Ajuste de preços: Fraldinha e Leitoa (barracas Churrasco/Assados e Almoço).
--   - "Fraldinha 300g" -> "Fraldinha 500g", preço 30 -> 20.
--   - "Leitoa - 1/2 kilo" / "Leitoa Assada 1/2 kilo": preço 40 -> 25.
--   - "Leitoa - por kilo" / "Leitoa Assada por kilo": preço 80 -> 50.
-- Idempotente: usa nome atual como filtro, então reaplicar após a 1ª vez é no-op
-- (não vai encontrar mais "Fraldinha 300g" para renomear).

update public.itens
   set nome = 'Fraldinha 500g',
       preco = 20.00
 where nome = 'Fraldinha 300g';

update public.itens
   set preco = 25.00
 where nome in ('Leitoa - 1/2 kilo', 'Leitoa Assada 1/2 kilo');

update public.itens
   set preco = 50.00
 where nome in ('Leitoa - por kilo', 'Leitoa Assada por kilo');
