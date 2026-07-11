import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCheckout } from '../hooks/useCheckout'
import type { StatusPedido } from '../types'
import { formatBRL } from '../utils/format'

const MODO_SIMULADO = import.meta.env.VITE_MODO_SIMULADO !== 'false'

const LABEL_STATUS: Record<StatusPedido, string> = {
  aguardando_pagamento: 'Aguardando pagamento',
  recebido: 'Recebido',
  preparando: 'Preparando',
  pronto: 'Pronto para retirar',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const COR_STATUS: Record<StatusPedido, string> = {
  aguardando_pagamento: 'bg-gray-200 text-gray-700',
  recebido: 'bg-blue-100 text-blue-800',
  preparando: 'bg-yellow-100 text-yellow-900',
  pronto: 'bg-green-100 text-green-800',
  entregue: 'bg-gray-100 text-gray-500',
  cancelado: 'bg-red-100 text-red-800',
}

export default function Checkout() {
  const { pedidoId } = useParams<{ pedidoId: string }>()
  const { pedido, subPedidos, itensPorSub, setores, carregando, erro } =
    useCheckout(pedidoId)
  const [pagando, setPagando] = useState(false)
  const [erroSim, setErroSim] = useState<string | null>(null)

  useEffect(() => {
    if (!pedidoId || !pedido) return
    if (pedido.status_pagto !== 'pendente') return
    if (pedido.mp_qr_code) return
    supabase
      .rpc('iniciar_cobranca_simulada', { p_pedido_id: pedidoId })
      .then(({ error }) => {
        if (error) console.error('[checkout] iniciar cobrança:', error.message)
      })
  }, [pedidoId, pedido])

  async function simularPagamento() {
    if (!pedidoId) return
    setPagando(true)
    setErroSim(null)
    const { error } = await supabase.rpc('simular_pagamento', {
      p_pedido_id: pedidoId,
    })
    setPagando(false)
    if (error) setErroSim(error.message)
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-arraia-cream">
        <p className="text-arraia-brown/70">Carregando pedido…</p>
      </div>
    )
  }

  if (erro || !pedido) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-arraia-cream p-4 gap-3 text-center">
        <p className="text-arraia-red font-semibold">
          {erro ?? 'Pedido não encontrado'}
        </p>
        <Link
          to="/"
          className="bg-arraia-brown-dark text-arraia-cream px-4 py-2 rounded-md font-bold"
        >
          Voltar ao cardápio
        </Link>
      </div>
    )
  }

  const pago = pedido.status_pagto === 'pago'
  const setoresPorId = new Map(setores.map((s) => [s.id, s]))
  const subOrdenados = [...subPedidos].sort((a, b) => {
    const sa = setoresPorId.get(a.setor_id)
    const sb = setoresPorId.get(b.setor_id)
    return (sa?.ordem ?? 0) - (sb?.ordem ?? 0)
  })

  return (
    <div className="min-h-screen bg-arraia-cream pb-10">
      <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xs opacity-80 hover:opacity-100">
            ← cardápio
          </Link>
          <span className="text-xs opacity-80">Pedido</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Bloco pagamento */}
        {!pago && (
          <section className="bg-white rounded-xl shadow p-5 text-center space-y-4">
            <h1 className="text-lg font-bold text-arraia-brown-dark">
              Pague com PIX para liberar o pedido
            </h1>

            <div className="mx-auto w-56 h-56 border-4 border-dashed border-arraia-brown/30 rounded-xl flex items-center justify-center text-xs text-arraia-brown/60 p-3">
              {MODO_SIMULADO
                ? 'QR PIX (modo simulado — sem integração)'
                : 'Carregando QR PIX…'}
            </div>

            {pedido.mp_qr_code && (
              <p className="text-[11px] font-mono text-arraia-brown/70 break-all">
                {pedido.mp_qr_code}
              </p>
            )}

            <p className="text-arraia-brown-dark font-semibold">
              Total: {formatBRL(pedido.total)}
            </p>

            {MODO_SIMULADO && (
              <>
                <button
                  onClick={simularPagamento}
                  disabled={pagando}
                  className="w-full bg-green-700 text-white font-bold py-3 rounded-md disabled:opacity-60"
                >
                  {pagando ? 'Confirmando…' : '✓ Simular pagamento'}
                </button>
                <p className="text-[11px] text-arraia-brown/50">
                  Este botão só aparece no modo desenvolvimento. Será removido
                  quando integrarmos o Mercado Pago.
                </p>
              </>
            )}

            {erroSim && (
              <p className="text-sm text-arraia-red">{erroSim}</p>
            )}
          </section>
        )}

        {pago && (
          <section className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800 font-bold">
              ✓ Pagamento confirmado
            </p>
            <p className="text-sm text-green-700 mt-1">
              Retire seu pedido nas barracas abaixo mostrando a senha
              correspondente.
            </p>
          </section>
        )}

        {/* Cards por setor */}
        <section className="space-y-3">
          {subOrdenados.map((sp) => {
            const setor = setoresPorId.get(sp.setor_id)
            const itens = itensPorSub[sp.id] ?? []
            const totalUnidades = itens.reduce(
              (acc, it) => acc + it.quantidade,
              0
            )
            const totalEntregues = itens.reduce(
              (acc, it) => acc + it.qtd_entregue,
              0
            )
            const mostrarRetirada =
              pago && totalUnidades > 0 && sp.status !== 'cancelado'
            return (
              <div
                key={sp.id}
                className="bg-white rounded-xl shadow p-4 border-l-4"
                style={{ borderColor: setor?.cor ?? '#4E342E' }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="font-bold"
                    style={{ color: setor?.cor ?? '#4E342E' }}
                  >
                    {setor?.nome ?? 'Setor'}
                  </h2>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${COR_STATUS[sp.status]}`}
                  >
                    {LABEL_STATUS[sp.status]}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-arraia-brown/60 uppercase tracking-wide">
                      Senha
                    </p>
                    <p className="text-3xl font-bold text-arraia-brown-dark">
                      {sp.senha ?? '—'}
                    </p>
                  </div>
                  <p className="text-sm text-arraia-brown-dark font-semibold">
                    {formatBRL(sp.subtotal)}
                  </p>
                </div>

                {mostrarRetirada && (
                  <p className="mt-2 text-xs text-arraia-brown/70">
                    Retirados:{' '}
                    <span className="font-bold text-arraia-brown-dark">
                      {totalEntregues} de {totalUnidades}
                    </span>
                  </p>
                )}
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}
