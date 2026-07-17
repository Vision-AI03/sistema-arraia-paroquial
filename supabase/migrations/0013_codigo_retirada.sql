-- Código curto de retirada: número que o cliente apresenta no caixa para
-- imprimir as fichas. Atribuído apenas quando o pedido é PAGO, então a
-- numeração fica densa (não gasta código com pedido abandonado/não pago).

-- Sequência dedicada. Começa em 1001 => sempre 4 dígitos até 9999.
create sequence if not exists public.codigo_pedido_seq start 1001;

alter table public.pedidos
  add column if not exists codigo int;

create unique index if not exists pedidos_codigo_key
  on public.pedidos (codigo);

-- Redefine o trigger de confirmação de pagamento para também atribuir o código.
-- (Mesma lógica de senha por setor de 0006, + atribuição do código.)
create or replace function public.ao_confirmar_pagamento()
returns trigger language plpgsql
security definer set search_path = public
as $$
begin
  if new.status_pagto = 'pago' and old.status_pagto <> 'pago' then
    new.pago_em = coalesce(new.pago_em, now());
    new.codigo  = coalesce(new.codigo, nextval('public.codigo_pedido_seq')::int);

    update public.pedido_setores ps
       set senha  = public.proxima_senha(ps.setor_id),
           status = 'recebido'
     where ps.pedido_id = new.id
       and ps.senha is null;
  end if;
  return new;
end $$;
-- O índice único pedidos_codigo_key já cobre a busca do caixa por código.
