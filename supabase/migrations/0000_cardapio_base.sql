-- Base do cardápio: categorias, itens e variações (sabores).
-- Estas tabelas precisam existir antes de 0002 (que adiciona setor_id em categorias)
-- e antes de 0003 (que aplica RLS pública de leitura).

-- Categorias do cardápio (ex.: "Pastéis", "Espetinhos", "Refri").
-- setor_id é adicionado em 0002_pedidos.sql e vinculado pelo admin depois.
create table public.categorias (
  id       uuid primary key default gen_random_uuid(),
  nome     text not null,
  ordem    int  not null default 0,
  ativo    boolean not null default true
);

create index categorias_ordem_idx on public.categorias (ordem);

-- Itens vendáveis. Preço é fonte da verdade para o RPC criar_pedido.
create table public.itens (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  nome         text not null,
  descricao    text,
  preco        numeric(10,2) not null check (preco >= 0),
  disponivel   boolean not null default true,
  alcoolico    boolean not null default false,
  ordem        int  not null default 0
);

create index itens_categoria_idx on public.itens (categoria_id);
create index itens_ordem_idx     on public.itens (ordem);

-- Variações / sabores do item (ex.: pastel de carne / queijo / frango).
-- Opcional: item sem variação também é válido.
create table public.item_variacoes (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.itens(id) on delete cascade,
  nome       text not null,
  disponivel boolean not null default true,
  ordem      int  not null default 0
);

create index item_variacoes_item_idx on public.item_variacoes (item_id);
