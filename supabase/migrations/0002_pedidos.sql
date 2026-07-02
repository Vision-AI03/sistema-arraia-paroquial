-- Modelo por setores: pedidos (cabeça / pagamento) + pedido_setores (sub-pedido por barraca).
-- Cada setor tem seu próprio KDS e sua própria numeração de senha.

-- Setores físicos da festa (barracas). Ordem/cor usados pela UI.
create table public.setores (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  prefixo_senha text not null unique check (length(prefixo_senha) between 1 and 2),
  cor text,                       -- hex, opcional
  ordem int not null default 0,
  ativo boolean not null default true,
  proximo_numero int not null default 1  -- sequência da senha independente por setor
);

-- Cada categoria do cardápio pertence a um setor
alter table public.categorias
  add column setor_id uuid references public.setores(id);

create index categorias_setor_idx on public.categorias (setor_id);

-- Status do pagamento no pedido pai
create type public.status_pagamento as enum (
  'pendente',
  'pago',
  'expirado',
  'estornado'
);

-- Status operacional do sub-pedido (visto pela cozinha)
create type public.status_pedido as enum (
  'aguardando_pagamento',
  'recebido',
  'preparando',
  'pronto',
  'entregue',
  'cancelado'
);

-- Cabeça do pedido: um por checkout, uma cobrança PIX no MP.
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  total numeric(10,2) not null check (total >= 0),
  status_pagto public.status_pagamento not null default 'pendente',
  mp_payment_id text,             -- id da cobrança/pagamento no Mercado Pago
  mp_qr_code text,                -- payload PIX copia-e-cola
  observacao text,
  criado_em timestamptz not null default now(),
  pago_em timestamptz,
  expira_em timestamptz,          -- expira cobrança PIX após N minutos
  atualizado_em timestamptz not null default now()
);

create index pedidos_status_pagto_idx on public.pedidos (status_pagto);
create index pedidos_criado_em_idx on public.pedidos (criado_em desc);

-- Sub-pedido por setor: cada barraca vê e opera só o que é dela.
create table public.pedido_setores (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  setor_id uuid not null references public.setores(id),
  senha text,                     -- alocada quando pedido é pago; formato ex: 'S047'
  status public.status_pedido not null default 'aguardando_pagamento',
  subtotal numeric(10,2) not null check (subtotal >= 0),
  retirado_em timestamptz,
  atualizado_em timestamptz not null default now(),
  unique (setor_id, senha)
);

create index pedido_setores_status_idx on public.pedido_setores (status)
  where status in ('recebido', 'preparando', 'pronto');
create index pedido_setores_pedido_idx on public.pedido_setores (pedido_id);
create index pedido_setores_setor_idx on public.pedido_setores (setor_id);

-- Itens do sub-pedido. Snapshot congela nome/preço no momento do pedido.
create table public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_setor_id uuid not null references public.pedido_setores(id) on delete cascade,
  item_id uuid not null references public.itens(id),
  variacao_id uuid references public.item_variacoes(id),
  nome_snapshot text not null,
  variacao_snapshot text,
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  quantidade integer not null check (quantidade > 0),
  observacao text
);

create index pedido_itens_setor_idx on public.pedido_itens (pedido_setor_id);

-- Triggers de atualizado_em
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

create trigger pedidos_atualizado_em
  before update on public.pedidos
  for each row execute function public.tocar_atualizado_em();

create trigger pedido_setores_atualizado_em
  before update on public.pedido_setores
  for each row execute function public.tocar_atualizado_em();

-- Cliente não usa mais mesas — deixamos a tabela existir para compatibilidade,
-- mas nada nova referencia. Se quiser dropar, rode:
--   drop table if exists public.mesas cascade;
