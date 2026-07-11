import { useCallback, useMemo, useState } from 'react'
import type { CarrinhoItem, Item } from '../types'

export function useCarrinho() {
  const [itens, setItens] = useState<CarrinhoItem[]>([])

  const adicionar = useCallback((item: Item) => {
    setItens((prev) => {
      const i = prev.findIndex((p) => p.item_id === item.id)
      if (i >= 0) {
        const copia = [...prev]
        copia[i] = { ...copia[i], quantidade: copia[i].quantidade + 1 }
        return copia
      }
      return [
        ...prev,
        {
          item_id: item.id,
          nome: item.nome,
          preco: Number(item.preco),
          quantidade: 1,
        },
      ]
    })
  }, [])

  const remover = useCallback((item_id: string) => {
    setItens((prev) => {
      const i = prev.findIndex((p) => p.item_id === item_id)
      if (i < 0) return prev
      const copia = [...prev]
      const q = copia[i].quantidade - 1
      if (q <= 0) copia.splice(i, 1)
      else copia[i] = { ...copia[i], quantidade: q }
      return copia
    })
  }, [])

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
