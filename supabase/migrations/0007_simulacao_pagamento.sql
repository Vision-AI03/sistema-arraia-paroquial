-- ⚠️ MODO SIMULADO — remover ou restringir antes de produção.
-- Estas RPCs permitem testar o fluxo cliente → cozinha sem integração Mercado Pago.
-- Quando o webhook do MP for plugado, essas duas funções são substituídas por Edge Functions.

-- Inicia uma cobrança fake: preenche mp_qr_code com um payload de placeholder.
-- Em produção: substituído por Edge Function que chama a API do Mercado Pago.
create or replace function public.iniciar_cobranca_simulada(p_pedido_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_status public.status_pagamento;
  v_payload text;
begin
  select status_pagto into v_status
    from public.pedidos where id = p_pedido_id;

  if v_status is null then
    raise exception 'pedido nao encontrado';
  end if;

  if v_status <> 'pendente' then
    raise exception 'pedido nao esta pendente';
  end if;

  v_payload := 'SIMULADO-' || p_pedido_id::text;

  update public.pedidos
     set mp_qr_code    = v_payload,
         mp_payment_id = 'sim_' || substr(p_pedido_id::text, 1, 8)
   where id = p_pedido_id;

  return v_payload;
end $$;

-- Marca o pedido como pago; o trigger ao_confirmar_pagamento aloca as senhas.
-- Em produção: substituído por webhook do MP (usa service_role).
create or replace function public.simular_pagamento(p_pedido_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.pedidos
     set status_pagto = 'pago'
   where id = p_pedido_id
     and status_pagto = 'pendente';

  if not found then
    raise exception 'pedido nao esta pendente ou nao existe';
  end if;
end $$;

grant execute on function public.iniciar_cobranca_simulada(uuid) to anon;
grant execute on function public.simular_pagamento(uuid) to anon;
