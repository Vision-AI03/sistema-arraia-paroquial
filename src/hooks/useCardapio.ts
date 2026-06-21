import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Categoria, Item, ItemVariacao } from '../types'

export type CategoriaComItens = Categoria & { itens: Item[] }

export function useCardapio() {
  const [categorias, setCategorias] = useState<CategoriaComItens[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      try {
        const [catRes, itensRes, varRes] = await Promise.all([
          supabase
            .from('categorias')
            .select('id, nome, ordem, ativo')
            .eq('ativo', true)
            .order('ordem', { ascending: true }),
          supabase
            .from('itens')
            .select(
              'id, categoria_id, nome, descricao, preco, disponivel, alcoolico, ordem'
            )
            .eq('disponivel', true)
            .order('ordem', { ascending: true }),
          supabase
            .from('item_variacoes')
            .select('id, item_id, nome, disponivel, ordem')
            .order('ordem', { ascending: true }),
        ])

        if (catRes.error) throw catRes.error
        if (itensRes.error) throw itensRes.error
        if (varRes.error) throw varRes.error

        const variacoesPorItem = new Map<string, ItemVariacao[]>()
        for (const v of (varRes.data ?? []) as ItemVariacao[]) {
          const lista = variacoesPorItem.get(v.item_id) ?? []
          lista.push(v)
          variacoesPorItem.set(v.item_id, lista)
        }

        const itensPorCat = new Map<string, Item[]>()
        for (const it of (itensRes.data ?? []) as Item[]) {
          const item: Item = {
            ...it,
            preco: Number(it.preco),
            variacoes: variacoesPorItem.get(it.id) ?? [],
          }
          const lista = itensPorCat.get(it.categoria_id) ?? []
          lista.push(item)
          itensPorCat.set(it.categoria_id, lista)
        }

        const resultado: CategoriaComItens[] = (
          (catRes.data ?? []) as Categoria[]
        )
          .map((c) => ({ ...c, itens: itensPorCat.get(c.id) ?? [] }))
          .filter((c) => c.itens.length > 0)

        if (!cancelado) setCategorias(resultado)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'erro desconhecido'
        if (!cancelado) setErro(msg)
        console.error('[cardapio] erro:', e)
      } finally {
        if (!cancelado) setCarregando(false)
      }
    }

    carregar()
    return () => {
      cancelado = true
    }
  }, [])

  return { categorias, carregando, erro }
}
