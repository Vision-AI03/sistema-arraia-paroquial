export type Categoria = {
  id: string
  nome: string
  ordem: number
  ativo: boolean
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

export type Mesa = {
  id: string
  numero: number
  token: string
  ativo: boolean
}

export type CarrinhoItem = {
  item_id: string
  nome: string
  preco: number
  quantidade: number
}
