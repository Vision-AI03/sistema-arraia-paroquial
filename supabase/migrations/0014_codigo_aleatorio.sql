-- Código de retirada passa a ser ALEATÓRIO (não sequencial), para evitar que
-- alguém adivinhe o próximo código e retire o pedido de outra pessoa "na
-- sequência". Mantém 4 dígitos (1000..9999), único, gerado no pagamento.

create or replace function public.ao_confirmar_pagamento()
returns trigger language plpgsql
security definer set search_path = public
as $$
begin
  if new.status_pagto = 'pago' and old.status_pagto <> 'pago' then
    new.pago_em = coalesce(new.pago_em, now());

    -- Código aleatório único (retry em caso de colisão; espaço 1000..9999).
    if new.codigo is null then
      loop
        new.codigo := 1000 + floor(random() * 9000)::int;
        exit when not exists (
          select 1 from public.pedidos p where p.codigo = new.codigo
        );
      end loop;
    end if;

    update public.pedido_setores ps
       set senha  = public.proxima_senha(ps.setor_id),
           status = 'recebido'
     where ps.pedido_id = new.id
       and ps.senha is null;
  end if;
  return new;
end $$;

-- A sequência não é mais usada.
drop sequence if exists public.codigo_pedido_seq;
