import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatBRL } from '../utils/format'
import type { PedidoComReembolso, PedidoItem } from '../types'

type ItemCancelado = {
  nome: string
  variacao: string | null
  quantidade: number
  valor: number
}

export default function AdminReembolsos() {
  const { perfil, sair } = useAuth()
  const [pedidos, setPedidos] = useState<PedidoComReembolso[]>([])
  const [detalhes, setDetalhes] = useState<Record<string, ItemCancelado[]>>({})
  const [expandido, setExpandido] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarResolvidos, setMostrarResolvidos] = useState(false)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const { data, error } = await supabase
        .from('pedidos_com_reembolso')
        .select(
          'pedido_id, criado_em, pago_em, valor_a_ressarcir, unidades_canceladas, resolvido, resolvido_em'
        )
        .order('criado_em', { ascending: false })
      if (cancelado) return
      if (error) setErro(error.message)
      else
        setPedidos(
          ((data ?? []) as PedidoComReembolso[]).map((p) => ({
            ...p,
            valor_a_ressarcir: Number(p.valor_a_ressarcir),
          }))
        )
      setCarregando(false)
    }
    carregar()

    const canal = supabase
      .channel('admin-reembolsos')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedido_itens' },
        () => carregar()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reembolsos_resolvidos' },
        () => carregar()
      )
      .subscribe()
    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [])

  async function abrirDetalhe(pedidoId: string) {
    if (expandido === pedidoId) {
      setExpandido(null)
      return
    }
    setExpandido(pedidoId)
    if (detalhes[pedidoId]) return
    const { data, error } = await supabase
      .from('pedido_itens')
      .select(
        'nome_snapshot, variacao_snapshot, qtd_cancelada, preco_unitario, pedido_setor_id'
      )
      .gt('qtd_cancelada', 0)
    if (error) return
    const subIds = [
      ...new Set((data ?? []).map((d) => d.pedido_setor_id as string)),
    ]
    if (subIds.length === 0) return
    const { data: subs } = await supabase
      .from('pedido_setores')
      .select('id, pedido_id')
      .in('id', subIds)
    const subPorPedido = new Map<string, Set<string>>()
    for (const s of subs ?? []) {
      const set =
        subPorPedido.get(s.pedido_id as string) ?? new Set<string>()
      set.add(s.id as string)
      subPorPedido.set(s.pedido_id as string, set)
    }
    const setDoPedido = subPorPedido.get(pedidoId) ?? new Set()
    const itens: ItemCancelado[] = ((data ?? []) as Partial<PedidoItem>[])
      .filter((d) => setDoPedido.has(d.pedido_setor_id as string))
      .map((d) => ({
        nome: d.nome_snapshot as string,
        variacao: (d.variacao_snapshot as string | null) ?? null,
        quantidade: d.qtd_cancelada as number,
        valor: (d.qtd_cancelada as number) * Number(d.preco_unitario),
      }))
    setDetalhes((old) => ({ ...old, [pedidoId]: itens }))
  }

  async function marcarResolvido(p: PedidoComReembolso) {
    const obs = prompt('Observação (opcional, ex.: pago em dinheiro, troca):')
    if (obs === null) return
    setSalvando(p.pedido_id)
    setErro(null)
    const { data: sess } = await supabase.auth.getSession()
    const userId = sess.session?.user.id
    const { error } = await supabase.from('reembolsos_resolvidos').upsert({
      pedido_id: p.pedido_id,
      resolvido_por: userId,
      observacao: obs || null,
    })
    setSalvando(null)
    if (error) setErro(error.message)
  }

  async function desfazer(p: PedidoComReembolso) {
    if (!confirm('Desfazer marcação de resolvido?')) return
    setSalvando(p.pedido_id)
    const { error } = await supabase
      .from('reembolsos_resolvidos')
      .delete()
      .eq('pedido_id', p.pedido_id)
    setSalvando(null)
    if (error) setErro(error.message)
  }

  const pendentes = pedidos.filter((p) => !p.resolvido)
  const resolvidos = pedidos.filter((p) => p.resolvido)
  const mostrados = mostrarResolvidos ? pedidos : pendentes
  const totalPendente = pendentes.reduce(
    (acc, p) => acc + p.valor_a_ressarcir,
    0
  )

  return (
    <div className="min-h-screen bg-arraia-cream">
      <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link
            to="/admin"
            className="text-xs opacity-80 hover:opacity-100 block"
          >
            ← voltar
          </Link>
          <h1 className="font-bold text-lg">Reembolsos</h1>
          <p className="text-xs opacity-80">Olá, {perfil?.nome}</p>
        </div>
        <button
          onClick={sair}
          className="text-xs bg-arraia-cream/10 hover:bg-arraia-cream/20 rounded px-3 py-1"
        >
          Sair
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        <section className="bg-white rounded-xl shadow p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm text-arraia-brown/70">Total pendente</p>
            <p className="text-2xl font-bold text-arraia-red">
              {formatBRL(totalPendente)}
            </p>
            <p className="text-xs text-arraia-brown/60">
              {pendentes.length} pedido(s) • {resolvidos.length} resolvido(s)
            </p>
          </div>
          <label className="text-sm text-arraia-brown-dark flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarResolvidos}
              onChange={(e) => setMostrarResolvidos(e.target.checked)}
            />
            mostrar resolvidos
          </label>
        </section>

        {erro && <p className="text-arraia-red text-sm">{erro}</p>}
        {carregando && (
          <p className="text-center text-arraia-brown/70">Carregando…</p>
        )}

        {!carregando && mostrados.length === 0 && (
          <p className="text-center text-arraia-brown/60 py-6">
            Nenhum reembolso {mostrarResolvidos ? '' : 'pendente'} no momento.
          </p>
        )}

        <ul className="space-y-2">
          {mostrados.map((p) => (
            <li
              key={p.pedido_id}
              className={
                'bg-white rounded-lg shadow-sm p-3 border-l-4 ' +
                (p.resolvido ? 'border-green-500' : 'border-arraia-red')
              }
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-mono text-[11px] text-arraia-brown/60">
                    {p.pedido_id.slice(0, 8)}
                  </p>
                  <p className="text-sm text-arraia-brown-dark">
                    {new Date(p.criado_em).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-arraia-brown/70">
                    {p.unidades_canceladas} unidade(s) cancelada(s)
                  </p>
                </div>
                <p className="font-bold text-lg text-arraia-red">
                  {formatBRL(p.valor_a_ressarcir)}
                </p>
              </div>
              <div className="mt-2 flex gap-2 flex-wrap">
                <button
                  onClick={() => abrirDetalhe(p.pedido_id)}
                  className="text-xs bg-arraia-cream text-arraia-brown-dark px-3 py-1 rounded-md hover:bg-arraia-gold/20"
                >
                  {expandido === p.pedido_id ? 'ocultar' : 'detalhes'}
                </button>
                {!p.resolvido ? (
                  <button
                    onClick={() => marcarResolvido(p)}
                    disabled={salvando === p.pedido_id}
                    className="text-xs bg-green-700 text-white px-3 py-1 rounded-md disabled:opacity-60"
                  >
                    {salvando === p.pedido_id ? '...' : 'Marcar como resolvido'}
                  </button>
                ) : (
                  <button
                    onClick={() => desfazer(p)}
                    disabled={salvando === p.pedido_id}
                    className="text-xs bg-arraia-brown/70 text-white px-3 py-1 rounded-md disabled:opacity-60"
                  >
                    desfazer
                  </button>
                )}
                {p.resolvido && p.resolvido_em && (
                  <span className="text-[11px] text-arraia-brown/60 self-center">
                    resolvido em {new Date(p.resolvido_em).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
              {expandido === p.pedido_id && (
                <ul className="mt-2 text-xs bg-arraia-cream/50 rounded p-2 space-y-1">
                  {(detalhes[p.pedido_id] ?? []).map((it, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>
                        {it.quantidade}× {it.nome}
                        {it.variacao && (
                          <span className="text-arraia-brown/60">
                            {' '}
                            ({it.variacao})
                          </span>
                        )}
                      </span>
                      <span className="font-semibold">{formatBRL(it.valor)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
