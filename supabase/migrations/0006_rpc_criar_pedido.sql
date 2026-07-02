-- Seed dos 6 setores da festa (nomes/prefixos editáveis pelo admin depois).
insert into public.setores (nome, prefixo_senha, cor, ordem) values
  ('Salgados',                'S',  '#C0392B', 1),  -- pasteis, cuscuz, kibe etc.
  ('Churrasco',               'C',  '#8B4513', 2),
  ('Cervejas e Refrigerantes','B',  '#2E86C1', 3),
  ('Chopp',                   'H',  '#E67E22', 4),
  ('Doces',                   'D',  '#E8B923', 5),
  ('Brincadeira',             'J',  '#4E9A51', 6)
on conflict (nome) do nothing;

-- Aloca a próxima senha do setor de forma atômica (numeração independente por setor).
create or replace function public.proxima_senha(p_setor_id uuid)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefixo text;
  v_numero  int;
begin
  update public.setores
    set proximo_numero = proximo_numero + 1
    where id = p_setor_id
    returning prefixo_senha, proximo_numero - 1
    into v_prefixo, v_numero;

  if v_prefixo is null then
    raise exception 'setor % nao encontrado', p_setor_id;
  end if;

  return v_prefixo || lpad(v_numero::text, 3, '0');
end $$;

-- Trigger: quando pedido vira 'pago', aloca senha em cada sub-pedido e move status.
create or replace function public.ao_confirmar_pagamento()
returns trigger language plpgsql
security definer set search_path = public
as $$
begin
  if new.status_pagto = 'pago' and old.status_pagto <> 'pago' then
    new.pago_em = coalesce(new.pago_em, now());

    update public.pedido_setores ps
       set senha  = public.proxima_senha(ps.setor_id),
           status = 'recebido'
     where ps.pedido_id = new.id
       and ps.senha is null;
  end if;
  return new;
end $$;

create trigger pedidos_confirma_pagamento
  before update on public.pedidos
  for each row execute function public.ao_confirmar_pagamento();

-- RPC para o cliente (anon) criar o pedido em uma única chamada.
-- Recebe JSON com carrinho; valida preço/disponibilidade contra o BD (não confia no client);
-- monta sub-pedidos por setor; retorna id do pedido para prosseguir ao checkout PIX.
--
-- Formato esperado do payload:
-- {
--   "itens": [
--     { "item_id": "uuid", "variacao_id": "uuid|null", "quantidade": 2, "observacao": "sem cebola" }
--   ],
--   "observacao": "opcional"
-- }
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
  if jsonb_array_length(coalesce(payload->'itens', '[]'::jsonb)) = 0 then
    raise exception 'pedido sem itens';
  end if;

  insert into public.pedidos (total, observacao, expira_em)
  values (0, payload->>'observacao', v_expira)
  returning id into v_pedido_id;

  -- Cria sub-pedido por setor sob demanda; agrega subtotal por setor.
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

    -- Busca item + setor autoritativamente (preço vem do BD, nunca do client)
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

      -- Encontra ou cria o sub-pedido do setor
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

-- Anon pode chamar o RPC
grant execute on function public.criar_pedido(jsonb) to anon;
