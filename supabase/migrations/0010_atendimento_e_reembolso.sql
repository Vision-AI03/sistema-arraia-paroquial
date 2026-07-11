-- ================================================================
-- 0010: horário de atendimento (fechar cardápio fora do expediente)
--       e cancelamento parcial de itens (fluxo de reembolso).
-- ================================================================

-- ----------------------------------------------------------------
-- Horários de atendimento
-- ----------------------------------------------------------------
create table if not exists public.configuracao_atendimento (
  data          date primary key,
  abre          time not null,
  fecha         time not null,
  aberto_manual boolean not null default true,
  atualizado_em timestamptz not null default now(),
  check (fecha > abre)
);

drop trigger if exists configuracao_atendimento_atualizado_em on public.configuracao_atendimento;
create trigger configuracao_atendimento_atualizado_em
  before update on public.configuracao_atendimento
  for each row execute function public.tocar_atualizado_em();

-- Seed dos 4 dias da festa 2026
insert into public.configuracao_atendimento (data, abre, fecha) values
  ('2026-07-18', '19:00', '23:30'),
  ('2026-07-19', '19:00', '23:30'),
  ('2026-07-25', '19:00', '23:30'),
  ('2026-07-26', '19:00', '23:30')
on conflict (data) do nothing;

-- Função: pedidos abertos agora? Usa timezone SP.
create or replace function public.esta_aberto()
returns boolean
language sql stable
security definer set search_path = public
as $$
  select coalesce(
    (
      select ca.aberto_manual
         and (now() at time zone 'America/Sao_Paulo')::time between ca.abre and ca.fecha
        from public.configuracao_atendimento ca
       where ca.data = (now() at time zone 'America/Sao_Paulo')::date
    ),
    false
  )
$$;

-- View com o status atual + próximo horário previsto
create or replace view public.status_atendimento as
select
  public.esta_aberto() as aberto,
  (
    select ca.data
      from public.configuracao_atendimento ca
     where ca.data > (now() at time zone 'America/Sao_Paulo')::date
        or (ca.data = (now() at time zone 'America/Sao_Paulo')::date
            and (now() at time zone 'America/Sao_Paulo')::time < ca.fecha)
     order by ca.data asc
     limit 1
  ) as proxima_data,
  (
    select ca.abre
      from public.configuracao_atendimento ca
     where ca.data > (now() at time zone 'America/Sao_Paulo')::date
        or (ca.data = (now() at time zone 'America/Sao_Paulo')::date
            and (now() at time zone 'America/Sao_Paulo')::time < ca.fecha)
     order by ca.data asc
     limit 1
  ) as proxima_abre,
  (
    select ca.fecha
      from public.configuracao_atendimento ca
     where ca.data = (now() at time zone 'America/Sao_Paulo')::date
       and (now() at time zone 'America/Sao_Paulo')::time between ca.abre and ca.fecha
  ) as fecha_hoje;

-- ----------------------------------------------------------------
-- Cancelamento parcial (itens que não foram entregues)
-- ----------------------------------------------------------------
alter table public.pedido_itens
  add column if not exists qtd_cancelada int not null default 0;

alter table public.pedido_itens
  drop constraint if exists pedido_itens_qtd_cancelada_check;

alter table public.pedido_itens
  add constraint pedido_itens_qtd_cancelada_check
  check (qtd_cancelada >= 0
     and qtd_entregue + qtd_cancelada <= quantidade);

-- Trigger de fechamento agora considera entregue OU cancelado
create or replace function public.ao_atualizar_qtd_entregue()
returns trigger language plpgsql
security definer set search_path = public
as $$
declare
  v_pendente int;
begin
  select coalesce(sum(quantidade - qtd_entregue - qtd_cancelada), 0)
    into v_pendente
    from public.pedido_itens
   where pedido_setor_id = new.pedido_setor_id;

  if v_pendente = 0 then
    update public.pedido_setores
       set status = 'entregue',
           retirado_em = coalesce(retirado_em, now())
     where id = new.pedido_setor_id
       and status = 'pronto';
  end if;

  return new;
end $$;

-- Recria o trigger para disparar também em qtd_cancelada
drop trigger if exists pedido_itens_ao_entregar on public.pedido_itens;
create trigger pedido_itens_ao_entregar
  after update of qtd_entregue, qtd_cancelada on public.pedido_itens
  for each row execute function public.ao_atualizar_qtd_entregue();

-- Tabela para admin marcar quando o ressarcimento foi efetuado
create table if not exists public.reembolsos_resolvidos (
  pedido_id     uuid primary key references public.pedidos(id) on delete cascade,
  resolvido_em  timestamptz not null default now(),
  resolvido_por uuid references auth.users(id),
  observacao    text
);

alter table public.reembolsos_resolvidos enable row level security;

drop policy if exists "reembolsos_admin_all" on public.reembolsos_resolvidos;
create policy "reembolsos_admin_all" on public.reembolsos_resolvidos
  for all using (public.papel_atual() = 'admin')
             with check (public.papel_atual() = 'admin');

-- View com pedidos a ressarcir (usada na tela /admin/reembolsos)
create or replace view public.pedidos_com_reembolso as
select
  p.id                                            as pedido_id,
  p.criado_em,
  p.pago_em,
  sum(pi.qtd_cancelada * pi.preco_unitario)       as valor_a_ressarcir,
  sum(pi.qtd_cancelada)                           as unidades_canceladas,
  rr.pedido_id is not null                        as resolvido,
  rr.resolvido_em
from public.pedidos p
join public.pedido_setores ps on ps.pedido_id = p.id
join public.pedido_itens   pi on pi.pedido_setor_id = ps.id
left join public.reembolsos_resolvidos rr on rr.pedido_id = p.id
where pi.qtd_cancelada > 0
  and p.status_pagto = 'pago'
group by p.id, p.criado_em, p.pago_em, rr.pedido_id, rr.resolvido_em;

-- ----------------------------------------------------------------
-- Recria criar_pedido bloqueando fora do horário
-- ----------------------------------------------------------------
create or replace function public.criar_pedido(payload jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_total    numeric(10,2) := 0;
  v_expira   timestamptz := now() + interval '15 minutes';
  r          record;
  v_setor_id uuid;
  v_ps_id    uuid;
begin
  if not public.esta_aberto() then
    raise exception 'pedidos_fechados';
  end if;

  if jsonb_array_length(coalesce(payload->'itens', '[]'::jsonb)) = 0 then
    raise exception 'pedido sem itens';
  end if;

  insert into public.pedidos (total, observacao, expira_em)
  values (0, payload->>'observacao', v_expira)
  returning id into v_pedido_id;

  for r in
    select
      (elem->>'item_id')::uuid                       as item_id,
      nullif(elem->>'variacao_id','')::uuid          as variacao_id,
      (elem->>'quantidade')::int                     as quantidade,
      elem->>'observacao'                            as observacao
    from jsonb_array_elements(payload->'itens') elem
  loop
    if r.quantidade is null or r.quantidade <= 0 then
      raise exception 'quantidade invalida';
    end if;

    declare
      v_nome    text;
      v_preco   numeric(10,2);
      v_disp    boolean;
      v_var_nome text;
      v_var_disp boolean;
    begin
      select i.nome, i.preco, i.disponivel, c.setor_id
        into v_nome, v_preco, v_disp, v_setor_id
        from public.itens i
        join public.categorias c on c.id = i.categoria_id
       where i.id = r.item_id;

      if v_nome is null then
        raise exception 'item % nao existe', r.item_id;
      end if;
      if not v_disp then
        raise exception 'item % indisponivel', v_nome;
      end if;
      if v_setor_id is null then
        raise exception 'item % sem setor definido', v_nome;
      end if;

      if r.variacao_id is not null then
        select v.nome, v.disponivel into v_var_nome, v_var_disp
          from public.item_variacoes v
         where v.id = r.variacao_id and v.item_id = r.item_id;
        if v_var_nome is null then
          raise exception 'variacao invalida';
        end if;
        if not v_var_disp then
          raise exception 'variacao % indisponivel', v_var_nome;
        end if;
      end if;

      select id into v_ps_id
        from public.pedido_setores
       where pedido_id = v_pedido_id and setor_id = v_setor_id;

      if v_ps_id is null then
        insert into public.pedido_setores (pedido_id, setor_id, subtotal)
        values (v_pedido_id, v_setor_id, 0)
        returning id into v_ps_id;
      end if;

      insert into public.pedido_itens (
        pedido_setor_id, item_id, variacao_id,
        nome_snapshot, variacao_snapshot,
        preco_unitario, quantidade, observacao
      ) values (
        v_ps_id, r.item_id, r.variacao_id,
        v_nome, v_var_nome,
        v_preco, r.quantidade, r.observacao
      );

      update public.pedido_setores
         set subtotal = subtotal + (v_preco * r.quantidade)
       where id = v_ps_id;

      v_total := v_total + (v_preco * r.quantidade);
    end;
  end loop;

  update public.pedidos set total = v_total where id = v_pedido_id;
  return v_pedido_id;
end $$;

-- ----------------------------------------------------------------
-- GRANTs e realtime
-- ----------------------------------------------------------------
grant select                        on public.configuracao_atendimento to anon, authenticated;
grant insert, update, delete        on public.configuracao_atendimento to authenticated;
grant select                        on public.status_atendimento       to anon, authenticated;
grant execute on function public.esta_aberto()                         to anon, authenticated;

grant select                        on public.reembolsos_resolvidos    to authenticated;
grant insert, update, delete        on public.reembolsos_resolvidos    to authenticated;
grant select                        on public.pedidos_com_reembolso    to authenticated;

alter table public.configuracao_atendimento enable row level security;

drop policy if exists "atendimento_public_read" on public.configuracao_atendimento;
create policy "atendimento_public_read" on public.configuracao_atendimento
  for select using (true);

drop policy if exists "atendimento_admin_all" on public.configuracao_atendimento;
create policy "atendimento_admin_all" on public.configuracao_atendimento
  for all using (public.papel_atual() = 'admin')
             with check (public.papel_atual() = 'admin');

-- Realtime pra cliente ver quando admin pausa/reabre pedidos
alter publication supabase_realtime add table public.configuracao_atendimento;
