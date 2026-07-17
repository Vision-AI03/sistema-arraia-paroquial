import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Pedido, PedidoItem, PedidoSetor, Setor } from '../types'
import { formatBRL } from '../utils/format'

type Barraca = { sp: PedidoSetor; setor?: Setor; itens: PedidoItem[] }
type PedidoCompleto = { pedido: Pedido; barracas: Barraca[] }

function horaSP(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Caixa() {
  const { perfil, sair } = useAuth()
  const [lista, setLista] = useState<PedidoCompleto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  const [impressos, setImpressos] = useState<Set<number>>(new Set())
  const [imprimindo, setImprimindo] = useState<PedidoCompleto | null>(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      const [pedRes, setRes] = await Promise.all([
        supabase
          .from('pedidos')
          .select(
            'id, total, status_pagto, mp_qr_code, observacao, criado_em, pago_em, codigo'
          )
          .eq('status_pagto', 'pago')
          .order('pago_em', { ascending: false })
          .limit(60),
        supabase
          .from('setores')
          .select('id, nome, prefixo_senha, cor, ordem, ativo')
          .order('ordem'),
      ])

      if (cancelado) return
      if (pedRes.error || setRes.error) {
        setErro(pedRes.error?.message ?? setRes.error?.message ?? 'Erro')
        setCarregando(false)
        return
      }

      const pedidos = (pedRes.data ?? []) as Pedido[]
      const setores = new Map(
        ((setRes.data ?? []) as Setor[]).map((s) => [s.id, s])
      )
      const pedidoIds = pedidos.map((p) => p.id)

      const subRes = pedidoIds.length
        ? await supabase
            .from('pedido_setores')
            .select(
              'id, pedido_id, setor_id, senha, status, subtotal, retirado_em'
            )
            .in('pedido_id', pedidoIds)
        : { data: [], error: null }

      if (cancelado) return
      if (subRes.error) {
        setErro(subRes.error.message)
        setCarregando(false)
        return
      }

      const subs = (subRes.data ?? []) as PedidoSetor[]
      const subIds = subs.map((s) => s.id)
      const itensRes = subIds.length
        ? await supabase
            .from('pedido_itens')
            .select('*')
            .in('pedido_setor_id', subIds)
        : { data: [], error: null }

      if (cancelado) return
      if (itensRes.error) {
        setErro(itensRes.error.message)
        setCarregando(false)
        return
      }

      const itensPorSub: Record<string, PedidoItem[]> = {}
      for (const it of (itensRes.data ?? []) as PedidoItem[]) {
        ;(itensPorSub[it.pedido_setor_id] ??= []).push(it)
      }

      const subsPorPedido: Record<string, PedidoSetor[]> = {}
      for (const s of subs) {
        ;(subsPorPedido[s.pedido_id] ??= []).push(s)
      }

      const completos: PedidoCompleto[] = pedidos.map((pedido) => ({
        pedido,
        barracas: (subsPorPedido[pedido.id] ?? [])
          .filter((sp) => sp.status !== 'cancelado')
          .sort(
            (a, b) =>
              (setores.get(a.setor_id)?.ordem ?? 0) -
              (setores.get(b.setor_id)?.ordem ?? 0)
          )
          .map((sp) => ({
            sp,
            setor: setores.get(sp.setor_id),
            itens: itensPorSub[sp.id] ?? [],
          })),
      }))

      setLista(completos)
      setCarregando(false)
    }

    carregar()

    // Realtime: novo pagamento confirmado -> recarrega a fila.
    const canal = supabase
      .channel('caixa-pedidos')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        () => carregar()
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [])

  function imprimir(pc: PedidoCompleto) {
    setImprimindo(pc)
    if (pc.pedido.codigo != null) {
      setImpressos((s) => new Set(s).add(pc.pedido.codigo as number))
    }
    // deixa o React montar as fichas antes de abrir o diálogo de impressão
    setTimeout(() => window.print(), 60)
  }

  const listaFiltrada = useMemo(() => {
    const f = filtro.trim()
    if (!f) return lista
    return lista.filter((pc) => String(pc.pedido.codigo ?? '').includes(f))
  }, [lista, filtro])

  return (
    <div className="min-h-screen bg-arraia-cream">
      {/* CSS de impressão: 80mm, uma ficha por página, corte entre elas */}
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 3mm; }
          html, body { background: #fff !important; }
          .caixa-tela { display: none !important; }
          .fichas-print { display: block !important; }
          .ficha { page-break-after: always; }
          .ficha:last-child { page-break-after: auto; }
        }
      `}</style>

      {/* ---------- TELA (não imprime) ---------- */}
      <div className="caixa-tela">
        <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <Link
              to="/admin"
              className="text-xs opacity-80 hover:opacity-100 block"
            >
              ← voltar
            </Link>
            <h1 className="font-bold text-lg">Caixa — impressão de fichas</h1>
            <p className="text-xs opacity-80">Olá, {perfil?.nome}</p>
          </div>
          <button
            onClick={sair}
            className="text-xs bg-arraia-cream/10 hover:bg-arraia-cream/20 rounded px-3 py-1"
          >
            Sair
          </button>
        </header>

        <main className="max-w-2xl mx-auto p-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-2">
            <input
              inputMode="numeric"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value.replace(/\D/g, ''))}
              placeholder="Filtrar pelo código (opcional)"
              className="flex-1 border border-arraia-brown/20 rounded px-3 py-2 text-lg"
            />
            {filtro && (
              <button
                onClick={() => setFiltro('')}
                className="text-sm text-arraia-brown/60 px-2"
              >
                limpar
              </button>
            )}
          </div>

          {erro && <p className="text-arraia-red text-sm">{erro}</p>}
          {carregando && (
            <p className="text-center text-arraia-brown/70">Carregando fila…</p>
          )}
          {!carregando && listaFiltrada.length === 0 && (
            <p className="text-center text-arraia-brown/60 bg-white rounded-xl shadow-sm p-6">
              {filtro
                ? `Nenhum pedido pago com código contendo "${filtro}".`
                : 'Nenhum pedido pago no momento. A fila atualiza sozinha quando um pagamento é confirmado.'}
            </p>
          )}

          <ul className="space-y-3">
            {listaFiltrada.map((pc) => {
              const jaImpresso =
                pc.pedido.codigo != null && impressos.has(pc.pedido.codigo)
              return (
                <li
                  key={pc.pedido.id}
                  className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                    jaImpresso ? 'opacity-60' : ''
                  }`}
                >
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-arraia-brown/60">
                        Código
                      </p>
                      <p className="text-4xl font-extrabold text-arraia-brown-dark leading-none">
                        {pc.pedido.codigo ?? '—'}
                      </p>
                      <p className="text-xs text-arraia-brown/60 mt-1">
                        pago às {horaSP(pc.pedido.pago_em)} •{' '}
                        {formatBRL(pc.pedido.total)}
                      </p>
                    </div>
                    <div className="text-right">
                      {jaImpresso && (
                        <span className="text-xs font-semibold text-green-700 block mb-2">
                          ✓ impresso
                        </span>
                      )}
                      <button
                        onClick={() => imprimir(pc)}
                        className="bg-arraia-red text-white rounded px-4 py-2 font-bold"
                      >
                        {jaImpresso ? '🖨 Imprimir de novo' : '🖨 Imprimir fichas'}
                      </button>
                    </div>
                  </div>

                  <ul className="px-4 pb-3 text-sm text-arraia-brown-dark border-t pt-3">
                    {pc.barracas.map((b) => (
                      <li key={b.sp.id} className="mb-1">
                        <span
                          className="font-semibold"
                          style={{ color: b.setor?.cor ?? '#4E342E' }}
                        >
                          {b.setor?.nome ?? 'Barraca'}
                        </span>{' '}
                        <span className="text-arraia-brown/60">
                          (senha {b.sp.senha ?? '—'}):
                        </span>{' '}
                        {b.itens
                          .map(
                            (it) =>
                              `${it.quantidade}× ${it.nome_snapshot}${
                                it.variacao_snapshot
                                  ? ` (${it.variacao_snapshot})`
                                  : ''
                              }`
                          )
                          .join(', ')}
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        </main>
      </div>

      {/* ---------- FICHAS (só na impressão) ----------
          Tira ÚNICA contínua por pedido (sem corte entre itens — o cliente
          destaca). Cada bloco é uma ficha completa e autossuficiente
          (cabeçalho + produto + valor + rodapé), separada por uma linha
          tracejada com bastante espaço em volta pra destacar sem rasgar. */}
      {imprimindo &&
        (() => {
          const unidades = imprimindo.barracas.flatMap((b) =>
            b.itens.flatMap((it) =>
              Array.from({ length: it.quantidade }).map((_, i) => ({
                it,
                key: `${it.id}-${i}`,
              }))
            )
          )
          return (
            <div className="fichas-print hidden">
              <div
                className="ficha"
                style={{
                  width: '72mm',
                  fontFamily: 'monospace',
                  color: '#000',
                  padding: '2mm 0',
                }}
              >
                {unidades.map(({ it, key }, idx) => (
                  <div key={key}>
                    <div style={{ textAlign: 'center', padding: '5mm 2mm' }}>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                        136ª Festa de São Sebastião
                      </div>
                      <div style={{ fontSize: '10px', marginTop: '1px' }}>
                        Paróquia Nossa Senhora da Conceição - Ipeúna/SP
                      </div>
                      <div
                        style={{
                          fontSize: '26px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          lineHeight: 1.15,
                          margin: '6mm 0 2mm',
                        }}
                      >
                        {it.nome_snapshot}
                        {it.variacao_snapshot
                          ? ` (${it.variacao_snapshot})`
                          : ''}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {formatBRL(it.preco_unitario)}
                      </div>
                      <div
                        style={{
                          fontSize: '8px',
                          marginTop: '5mm',
                          opacity: 0.6,
                        }}
                      >
                        Powered by VISION AI
                      </div>
                    </div>
                    {idx < unidades.length - 1 && (
                      <div
                        style={{
                          borderTop: '1px dashed #000',
                          margin: '0 4mm',
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
    </div>
  )
}
