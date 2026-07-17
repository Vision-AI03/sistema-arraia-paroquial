-- Persistir o "impresso" do caixa: antes ficava só no estado da aba, e ao
-- atualizar/voltar a página o botão voltava a "Imprimir" (risco de reimprimir).

alter table public.pedidos
  add column if not exists fichas_impressas_em timestamptz;

-- RPC para o caixa (cozinha/admin) marcar como impresso, sem depender de RLS
-- de UPDATE na tabela pedidos.
create or replace function public.marcar_fichas_impressas(p_pedido_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if public.papel_atual() not in ('cozinha', 'admin') then
    raise exception 'sem permissao';
  end if;

  update public.pedidos
     set fichas_impressas_em = coalesce(fichas_impressas_em, now())
   where id = p_pedido_id;
end $$;

grant execute on function public.marcar_fichas_impressas(uuid) to authenticated;
