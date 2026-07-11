import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type {
  ItemVariacao,
  PedidoItem,
  PedidoSetor,
  Setor,
  StatusPedido,
} from '../types'

const STATUS_ATIVOS: StatusPedido[] = ['recebido', 'preparando', 'pronto']

export type CardKDS = {
  sub: PedidoSetor
  itens: PedidoItem[]
  criado_em: string
}

export type EstadoCozinha = {
  cards: CardKDS[]
  setores: Setor[]
  variacoesPorItem: Record<string, ItemVariacao[]>
  carregando: boolean
  erro: string | null
}

export function useCozinha() {
  const [subs, setSubs] = useState<PedidoSetor[]>([])
  const [itensPorSub, setItensPorSub] = useState<Record<string, PedidoItem[]>>({})
  const [criadoEmPorPedido, setCriadoEmPorPedido] = useState<Record<string, string>>({})
  const [setores, setSetores] = useState<Setor[]>([])
  const [variacoesPorItem, setVariacoesPorItem] = useState<
    Record<string, ItemVariacao[]>
  >({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function fetchItens(subIds: string[]) {
      if (subIds.length === 0) return
      const { data, error } = await supabase
        .from('pedido_itens')
        .select(
          'id, pedido_setor_id, item_id, variacao_id, nome_snapshot, variacao_snapshot, preco_unitario, quantidade, qtd_entregue, observacao'
        )
        .in('pedido_setor_id', subIds)
      if (error) {
        console.error('[cozinha] itens:', error.message)
        return
      }
      const mapa: Record<string, PedidoItem[]> = {}
      const itemIds = new Set<string>()
      for (const it of (data ?? []) as PedidoItem[]) {
        ;(mapa[it.pedido_setor_id] ??= []).push(it)
        itemIds.add(it.item_id)
      }
      if (!cancelado) setItensPorSub((old) => ({ ...old, ...mapa }))
      if (itemIds.size > 0) await fetchVariacoes([...itemIds])
    }

    async function fetchVariacoes(itemIds: string[]) {
      const { data, error } = await supabase
        .from('item_variacoes')
        .select('id, item_id, nome, disponivel, ordem')
        .in('item_id', itemIds)
        .order('ordem')
      if (error) {
        console.error('[cozinha] variacoes:', error.message)
        return
      }
      const mapa: Record<string, ItemVariacao[]> = {}
      for (const v of (data ?? []) as ItemVariacao[]) {
        ;(mapa[v.item_id] ??= []).push(v)
      }
      if (!cancelado) setVariacoesPorItem((old) => ({ ...old, ...mapa }))
    }

    async function fetchCriadoEm(pedidoIds: string[]) {
      if (pedidoIds.length === 0) return
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, criado_em')
        .in('id', pedidoIds)
      if (error) {
        console.error('[cozinha] pedidos:', error.message)
        return
      }
      if (!cancelado) {
        setCriadoEmPorPedido((old) => {
          const novo = { ...old }
          for (const p of data ?? []) novo[p.id as string] = p.criado_em as string
          return novo
        })
      }
    }

    async function carregarInicial() {
      const [subRes, setRes] = await Promise.all([
        supabase
          .from('pedido_setores')
          .select(
            'id, pedido_id, setor_id, senha, status, subtotal, retirado_em, atualizado_em'
          )
          .in('status', STATUS_ATIVOS)
          .order('atualizado_em', { ascending: true }),
        supabase
          .from('setores')
          .select('id, nome, prefixo_senha, cor, ordem, ativo')
          .order('ordem'),
      ])

      if (cancelado) return

      if (subRes.error || setRes.error) {
        setErro(subRes.error?.message ?? setRes.error?.message ?? 'erro')
        setCarregando(false)
        return
      }

      const subsData = (subRes.data ?? []) as PedidoSetor[]
      setSubs(subsData)
      setSetores((setRes.data ?? []) as Setor[])

      await Promise.all([
        fetchItens(subsData.map((s) => s.id)),
        fetchCriadoEm([...new Set(subsData.map((s) => s.pedido_id))]),
      ])

      if (!cancelado) setCarregando(false)
    }

    carregarInicial()

    const canal = supabase
      .channel('cozinha-kds')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedido_itens' },
        (p) => {
          const novo = p.new as PedidoItem
          setItensPorSub((old) => {
            const lista = old[novo.pedido_setor_id]
            if (!lista) return old
            return {
              ...old,
              [novo.pedido_setor_id]: lista.map((it) =>
                it.id === novo.id ? { ...it, qtd_entregue: novo.qtd_entregue } : it
              ),
            }
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'item_variacoes' },
        (p) => {
          const novo = p.new as ItemVariacao
          setVariacoesPorItem((old) => {
            const lista = old[novo.item_id]
            if (!lista) return old
            return {
              ...old,
              [novo.item_id]: lista.map((v) =>
                v.id === novo.id ? { ...v, disponivel: novo.disponivel } : v
              ),
            }
          })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedido_setores' },
        async (payload) => {
          const novo = payload.new as PedidoSetor | undefined
          const antigo = payload.old as PedidoSetor | undefined
          if (payload.eventType === 'DELETE' && antigo) {
            setSubs((old) => old.filter((s) => s.id !== antigo.id))
            return
          }
          if (!novo) return
          const ativo = STATUS_ATIVOS.includes(novo.status)
          setSubs((old) => {
            const existe = old.some((s) => s.id === novo.id)
            if (!ativo) return old.filter((s) => s.id !== novo.id)
            if (existe) return old.map((s) => (s.id === novo.id ? novo : s))
            return [...old, novo]
          })
          if (ativo) {
            await Promise.all([
              fetchItens([novo.id]),
              fetchCriadoEm([novo.pedido_id]),
            ])
          }
        }
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [])

  const cards = useMemo<CardKDS[]>(
    () =>
      subs.map((sub) => ({
        sub,
        itens: itensPorSub[sub.id] ?? [],
        criado_em: criadoEmPorPedido[sub.pedido_id] ?? sub.atualizado_em ?? '',
      })),
    [subs, itensPorSub, criadoEmPorPedido]
  )

  return {
    cards,
    setores,
    variacoesPorItem,
    carregando,
    erro,
  } satisfies EstadoCozinha
}

export async function avancarStatus(
  subId: string,
  atual: StatusPedido
): Promise<{ erro: string | null }> {
  const proximo: Partial<Record<StatusPedido, StatusPedido>> = {
    recebido: 'preparando',
    preparando: 'pronto',
    pronto: 'entregue',
  }
  const alvo = proximo[atual]
  if (!alvo) return { erro: 'status final' }
  const patch: Record<string, unknown> = { status: alvo }
  if (alvo === 'entregue') patch.retirado_em = new Date().toISOString()
  const { error } = await supabase
    .from('pedido_setores')
    .update(patch)
    .eq('id', subId)
  return { erro: error?.message ?? null }
}

export async function esgotarItem(itemId: string): Promise<{ erro: string | null }> {
  const { error } = await supabase
    .from('itens')
    .update({ disponivel: false })
    .eq('id', itemId)
  return { erro: error?.message ?? null }
}

export async function esgotarVariacao(
  variacaoId: string
): Promise<{ erro: string | null }> {
  const { error } = await supabase
    .from('item_variacoes')
    .update({ disponivel: false })
    .eq('id', variacaoId)
  return { erro: error?.message ?? null }
}

export async function ajustarEntregue(
  it: PedidoItem,
  delta: number
): Promise<{ erro: string | null }> {
  const novo = Math.max(0, Math.min(it.quantidade, it.qtd_entregue + delta))
  if (novo === it.qtd_entregue) return { erro: null }
  const { error } = await supabase
    .from('pedido_itens')
    .update({ qtd_entregue: novo })
    .eq('id', it.id)
  return { erro: error?.message ?? null }
}

export async function entregarTudo(
  itens: PedidoItem[]
): Promise<{ erro: string | null }> {
  const alvo = itens.filter((it) => it.qtd_entregue < it.quantidade)
  for (const it of alvo) {
    const { error } = await supabase
      .from('pedido_itens')
      .update({ qtd_entregue: it.quantidade })
      .eq('id', it.id)
    if (error) return { erro: error.message }
  }
  return { erro: null }
}
