import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Pedido, PedidoItem, PedidoSetor, Setor } from '../types'

export type EstadoCheckout = {
  pedido: Pedido | null
  subPedidos: PedidoSetor[]
  itensPorSub: Record<string, PedidoItem[]>
  setores: Setor[]
  carregando: boolean
  erro: string | null
}

export function useCheckout(pedidoId: string | undefined) {
  const [estado, setEstado] = useState<EstadoCheckout>({
    pedido: null,
    subPedidos: [],
    itensPorSub: {},
    setores: [],
    carregando: true,
    erro: null,
  })

  useEffect(() => {
    if (!pedidoId) {
      setEstado((s) => ({ ...s, carregando: false, erro: 'pedido invalido' }))
      return
    }

    let cancelado = false

    async function carregar() {
      const [pedRes, subRes, setRes] = await Promise.all([
        supabase
          .from('pedidos')
          .select(
            'id, total, status_pagto, mp_qr_code, observacao, criado_em, pago_em'
          )
          .eq('id', pedidoId!)
          .maybeSingle(),
        supabase
          .from('pedido_setores')
          .select(
            'id, pedido_id, setor_id, senha, status, subtotal, retirado_em'
          )
          .eq('pedido_id', pedidoId!),
        supabase
          .from('setores')
          .select('id, nome, prefixo_senha, cor, ordem, ativo')
          .order('ordem'),
      ])

      if (cancelado) return

      if (pedRes.error || subRes.error || setRes.error) {
        setEstado({
          pedido: null,
          subPedidos: [],
          itensPorSub: {},
          setores: [],
          carregando: false,
          erro:
            pedRes.error?.message ??
            subRes.error?.message ??
            setRes.error?.message ??
            'erro',
        })
        return
      }

      const subsData = (subRes.data ?? []) as PedidoSetor[]
      const subIds = subsData.map((s) => s.id)
      let itensPorSub: Record<string, PedidoItem[]> = {}
      if (subIds.length > 0) {
        const { data: itensData } = await supabase
          .from('pedido_itens')
          .select(
            'id, pedido_setor_id, item_id, variacao_id, nome_snapshot, variacao_snapshot, preco_unitario, quantidade, qtd_entregue, observacao'
          )
          .in('pedido_setor_id', subIds)
        for (const it of (itensData ?? []) as PedidoItem[]) {
          ;(itensPorSub[it.pedido_setor_id] ??= []).push(it)
        }
      }

      setEstado({
        pedido: (pedRes.data as Pedido | null) ?? null,
        subPedidos: subsData,
        itensPorSub,
        setores: (setRes.data ?? []) as Setor[],
        carregando: false,
        erro: pedRes.data ? null : 'pedido nao encontrado',
      })
    }

    carregar()

    const canal = supabase
      .channel(`checkout-${pedidoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `id=eq.${pedidoId}`,
        },
        (payload) => {
          const novo = payload.new as Pedido
          setEstado((s) => ({ ...s, pedido: novo }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedido_setores',
          filter: `pedido_id=eq.${pedidoId}`,
        },
        (payload) => {
          const novo = payload.new as PedidoSetor
          setEstado((s) => ({
            ...s,
            subPedidos: s.subPedidos.some((sp) => sp.id === novo.id)
              ? s.subPedidos.map((sp) => (sp.id === novo.id ? novo : sp))
              : [...s.subPedidos, novo],
          }))
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedido_itens' },
        (payload) => {
          const novo = payload.new as PedidoItem
          setEstado((s) => {
            const lista = s.itensPorSub[novo.pedido_setor_id]
            if (!lista) return s
            return {
              ...s,
              itensPorSub: {
                ...s.itensPorSub,
                [novo.pedido_setor_id]: lista.map((it) =>
                  it.id === novo.id ? { ...it, qtd_entregue: novo.qtd_entregue } : it
                ),
              },
            }
          })
        }
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [pedidoId])

  return estado
}
