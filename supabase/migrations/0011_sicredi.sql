-- Integração Sicredi PIX (substitui as RPCs simuladas do 0007 quando em produção).
--
-- Convenção: reaproveitamos `mp_qr_code` como payload PIX copia-e-cola e
-- `mp_payment_id` como o e2eid do pagamento efetivado. As colunas novas guardam
-- metadados específicos da Sicredi para consulta/reconciliação.

alter table public.pedidos
  add column if not exists sicredi_txid     text unique,
  add column if not exists sicredi_location text;

create index if not exists pedidos_sicredi_txid_idx on public.pedidos (sicredi_txid);

-- Registra a cobrança criada pela Edge Function sicredi-cobranca.
-- Chamada com service_role a partir do backend.
create or replace function public.registrar_cobranca_sicredi(
  p_pedido_id uuid,
  p_txid      text,
  p_location  text,
  p_copia_cola text
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_status public.status_pagamento;
begin
  select status_pagto into v_status
    from public.pedidos where id = p_pedido_id;

  if v_status is null then
    raise exception 'pedido nao encontrado';
  end if;

  if v_status <> 'pendente' then
    raise exception 'pedido nao esta pendente (status=%)', v_status;
  end if;

  update public.pedidos
     set sicredi_txid     = p_txid,
         sicredi_location = p_location,
         mp_qr_code       = p_copia_cola
   where id = p_pedido_id;
end $$;

-- Confirma pagamento via webhook Sicredi. Idempotente: se já pago, retorna sem erro.
create or replace function public.confirmar_pagamento_sicredi(
  p_txid   text,
  p_e2eid  text
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_status    public.status_pagamento;
begin
  select id, status_pagto
    into v_pedido_id, v_status
    from public.pedidos
   where sicredi_txid = p_txid;

  if v_pedido_id is null then
    raise exception 'pedido nao encontrado para txid=%', p_txid;
  end if;

  if v_status = 'pago' then
    return v_pedido_id;
  end if;

  update public.pedidos
     set status_pagto  = 'pago',
         mp_payment_id = p_e2eid
   where id = v_pedido_id
     and status_pagto = 'pendente';

  return v_pedido_id;
end $$;

-- Só o service_role executa (Edge Functions). Nada de anon aqui.
revoke all on function public.registrar_cobranca_sicredi(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.confirmar_pagamento_sicredi(text, text)             from public, anon, authenticated;
grant execute on function public.registrar_cobranca_sicredi(uuid, text, text, text) to service_role;
grant execute on function public.confirmar_pagamento_sicredi(text, text)             to service_role;
