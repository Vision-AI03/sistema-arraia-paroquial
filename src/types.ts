export type Setor = {
  id: string
  nome: string
  prefixo_senha: string
  cor: string | null
  ordem: number
  ativo: boolean
}

export type Categoria = {
  id: string
  nome: string
  ordem: number
  ativo: boolean
  setor_id: string | null
}

export type ItemVariacao = {
  id: string
  item_id: string
  nome: string
  disponivel: boolean
  ordem: number
}

export type Item = {
  id: string
  categoria_id: string
  nome: string
  descricao: string | null
  preco: number
  disponivel: boolean
  alcoolico: boolean
  ordem: number
  variacoes?: ItemVariacao[]
}

export type CarrinhoItem = {
  item_id: string
  variacao_id: string | null
  variacao_nome: string | null
  nome: string
  preco: number
  quantidade: number
}

export type StatusPagamento = 'pendente' | 'pago' | 'expirado' | 'estornado'

export type StatusPedido =
  | 'aguardando_pagamento'
  | 'recebido'
  | 'preparando'
  | 'pronto'
  | 'entregue'
  | 'cancelado'

export type Pedido = {
  id: string
  total: number
  status_pagto: StatusPagamento
  mp_qr_code: string | null
  observacao: string | null
  criado_em: string
  pago_em: string | null
}

export type PedidoSetor = {
  id: string
  pedido_id: string
  setor_id: string
  senha: string | null
  status: StatusPedido
  subtotal: number
  retirado_em: string | null
  atualizado_em?: string
}

export type PedidoItem = {
  id: string
  pedido_setor_id: string
  item_id: string
  variacao_id: string | null
  nome_snapshot: string
  variacao_snapshot: string | null
  preco_unitario: number
  quantidade: number
  observacao: string | null
}

export type Papel = 'cozinha' | 'admin'

export type Perfil = {
  id: string
  nome: string
  papel: Papel
}
