-- Nome do cliente no pedido.
-- Motivo: o cliente digita o nome antes de gerar o PIX. Fica visível ao caixa
-- para rastrear o pedido mesmo quando a pessoa perde o código de retirada
-- (fecha a tela após pagar). Pedidos antigos ficam com nome_cliente = null.

alter table public.pedidos
  add column if not exists nome_cliente text;

-- Recria criar_pedido incorporando nome_cliente (obrigatório).
-- Mantém tudo que já existia: bloqueio fora do horário, preço autoritativo
-- vindo do BD, sub-pedidos por setor, expiração em 15 min.
create or replace function public.criar_pedido(payload jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_pedido_id uuid;
  v_total    numeric(10,2) := 0;
  v_expira   timestamptz := now() + interval '15 minutes';
  v_nome_cliente text;
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

  -- Nome é obrigatório: limpa espaços e limita a 60 chars.
  v_nome_cliente := nullif(btrim(payload->>'nome_cliente'), '');
  if v_nome_cliente is null then
    raise exception 'nome_obrigatorio';
  end if;
  v_nome_cliente := left(v_nome_cliente, 60);

  insert into public.pedidos (total, observacao, expira_em, nome_cliente)
  values (0, payload->>'observacao', v_expira, v_nome_cliente)
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

grant execute on function public.criar_pedido(jsonb) to anon, authenticated;
