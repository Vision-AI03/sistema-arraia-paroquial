import { useCallback, useMemo, useState } from 'react'
import type { CarrinhoItem, Item, ItemVariacao } from '../types'

function chave(item_id: string, variacao_id: string | null) {
  return `${item_id}::${variacao_id ?? ''}`
}

export function useCarrinho() {
  const [itens, setItens] = useState<CarrinhoItem[]>([])

  const adicionar = useCallback(
    (item: Item, variacao?: ItemVariacao | null) => {
      const variacao_id = variacao?.id ?? null
      const variacao_nome = variacao?.nome ?? null
      setItens((prev) => {
        const i = prev.findIndex(
          (p) => chave(p.item_id, p.variacao_id) === chave(item.id, variacao_id)
        )
        if (i >= 0) {
          const copia = [...prev]
          copia[i] = { ...copia[i], quantidade: copia[i].quantidade + 1 }
          return copia
        }
        return [
          ...prev,
          {
            item_id: item.id,
            variacao_id,
            variacao_nome,
            nome: item.nome,
            preco: Number(item.preco),
            quantidade: 1,
          },
        ]
      })
    },
    []
  )

  const remover = useCallback(
    (item_id: string, variacao_id: string | null) => {
      setItens((prev) => {
        const i = prev.findIndex(
          (p) => chave(p.item_id, p.variacao_id) === chave(item_id, variacao_id)
        )
        if (i < 0) return prev
        const copia = [...prev]
        const q = copia[i].quantidade - 1
        if (q <= 0) copia.splice(i, 1)
        else copia[i] = { ...copia[i], quantidade: q }
        return copia
      })
    },
    []
  )

  const limpar = useCallback(() => setItens([]), [])

  const total = useMemo(
    () => itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0),
    [itens]
  )
  const quantidadeTotal = useMemo(
    () => itens.reduce((acc, i) => acc + i.quantidade, 0),
    [itens]
  )

  return { itens, adicionar, remover, limpar, total, quantidadeTotal }
}
