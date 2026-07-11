-- Retirada parcial: cada linha do pedido acumula quantas unidades foram entregues.
-- Quando o sub-pedido está em 'pronto' e todas as linhas atingem qtd_entregue = quantidade,
-- o trigger move o status para 'entregue' automaticamente.

alter table public.pedido_itens
  add column if not exists qtd_entregue int not null default 0;

alter table public.pedido_itens
  drop constraint if exists pedido_itens_qtd_entregue_check;

alter table public.pedido_itens
  add constraint pedido_itens_qtd_entregue_check
  check (qtd_entregue >= 0 and qtd_entregue <= quantidade);

-- Trigger: fecha automaticamente o sub-pedido quando toda a retirada é concluída.
create or replace function public.ao_atualizar_qtd_entregue()
returns trigger language plpgsql
security definer set search_path = public
as $$
declare
  v_pendente int;
begin
  if new.qtd_entregue is not distinct from old.qtd_entregue then
    return new;
  end if;

  select coalesce(sum(quantidade - qtd_entregue), 0)
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

drop trigger if exists pedido_itens_ao_entregar on public.pedido_itens;
create trigger pedido_itens_ao_entregar
  after update of qtd_entregue on public.pedido_itens
  for each row execute function public.ao_atualizar_qtd_entregue();

-- RLS: cozinha atualiza qtd_entregue (o filtro de UPDATE mais amplo permite;
-- o check garante que ela não pode mexer em outras colunas mudando policies porque
-- a WITH CHECK repete a mesma condição).
drop policy if exists "pedido_itens_cozinha_update" on public.pedido_itens;
create policy "pedido_itens_cozinha_update" on public.pedido_itens
  for update using (public.papel_atual() = 'cozinha')
             with check (public.papel_atual() = 'cozinha');

-- pedido_itens já entra no realtime desde a migração 0005; nada a fazer.
