import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import {
  avancarStatus,
  esgotarItem,
  esgotarVariacao,
  useCozinha,
  type CardKDS,
} from '../hooks/useCozinha'
import type { ItemVariacao, PedidoItem, Setor, StatusPedido } from '../types'

const COLUNAS: { status: StatusPedido; titulo: string; acao: string }[] = [
  { status: 'recebido', titulo: 'Recebidos', acao: 'Iniciar preparo' },
  { status: 'preparando', titulo: 'Preparando', acao: 'Marcar pronto' },
  { status: 'pronto', titulo: 'Prontos', acao: 'Entregue' },
]

const FILTRO_KEY = 'cozinha:setor'

export default function Cozinha() {
  const { perfil, sair } = useAuth()
  const { cards, setores, variacoesPorItem, carregando, erro } = useCozinha()
  const [setorId, setSetorId] = useState<string>(
    () => localStorage.getItem(FILTRO_KEY) ?? 'todos'
  )
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 15000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    localStorage.setItem(FILTRO_KEY, setorId)
  }, [setorId])

  const setoresPorId = useMemo(
    () => new Map(setores.map((s) => [s.id, s])),
    [setores]
  )

  const filtrados = useMemo(
    () =>
      setorId === 'todos'
        ? cards
        : cards.filter((c) => c.sub.setor_id === setorId),
    [cards, setorId]
  )

  const porColuna = useMemo(() => {
    const mapa: Record<StatusPedido, CardKDS[]> = {
      aguardando_pagamento: [],
      recebido: [],
      preparando: [],
      pronto: [],
      entregue: [],
      cancelado: [],
    }
    for (const c of filtrados) mapa[c.sub.status].push(c)
    return mapa
  }, [filtrados])

  return (
    <div className="min-h-screen bg-arraia-cream">
      <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold">Cozinha — KDS</h1>
          <p className="text-xs opacity-80">Olá, {perfil?.nome}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={setorId}
            onChange={(e) => setSetorId(e.target.value)}
            className="text-arraia-brown-dark rounded px-2 py-1 text-sm"
          >
            <option value="todos">Todos os setores</option>
            {setores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
          <Link
            to="/disponibilidade"
            className="text-xs bg-arraia-cream/10 hover:bg-arraia-cream/20 rounded px-3 py-1"
          >
            Disponibilidade
          </Link>
          <button
            onClick={sair}
            className="text-xs bg-arraia-cream/10 hover:bg-arraia-cream/20 rounded px-3 py-1"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3">
        {carregando && (
          <p className="text-center text-arraia-brown/70 py-10">Carregando…</p>
        )}
        {erro && (
          <p className="text-center text-arraia-red py-6">Erro: {erro}</p>
        )}
        {!carregando && !erro && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {COLUNAS.map((col) => (
              <Coluna
                key={col.status}
                titulo={col.titulo}
                acao={col.acao}
                status={col.status}
                cards={porColuna[col.status]}
                setoresPorId={setoresPorId}
                variacoesPorItem={variacoesPorItem}
                agora={agora}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function Coluna({
  titulo,
  acao,
  status,
  cards,
  setoresPorId,
  variacoesPorItem,
  agora,
}: {
  titulo: string
  acao: string
  status: StatusPedido
  cards: CardKDS[]
  setoresPorId: Map<string, Setor>
  variacoesPorItem: Record<string, ItemVariacao[]>
  agora: number
}) {
  return (
    <section className="bg-white/60 rounded-xl p-2 min-h-[60vh]">
      <header className="flex items-center justify-between px-2 pb-2">
        <h2 className="font-bold text-arraia-brown-dark">{titulo}</h2>
        <span className="text-xs bg-arraia-brown-dark text-arraia-cream rounded-full px-2 py-0.5">
          {cards.length}
        </span>
      </header>
      <div className="space-y-2">
        {cards.length === 0 && (
          <p className="text-xs text-arraia-brown/50 text-center py-6">
            (vazio)
          </p>
        )}
        {cards.map((c) => (
          <Cartao
            key={c.sub.id}
            card={c}
            setor={setoresPorId.get(c.sub.setor_id)}
            variacoesPorItem={variacoesPorItem}
            acao={acao}
            status={status}
            agora={agora}
          />
        ))}
      </div>
    </section>
  )
}

function Cartao({
  card,
  setor,
  variacoesPorItem,
  acao,
  status,
  agora,
}: {
  card: CardKDS
  setor: Setor | undefined
  variacoesPorItem: Record<string, ItemVariacao[]>
  acao: string
  status: StatusPedido
  agora: number
}) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const cor = setor?.cor ?? '#4E342E'

  const minutos = card.criado_em
    ? Math.max(0, Math.floor((agora - new Date(card.criado_em).getTime()) / 60000))
    : 0
  const urgente = minutos >= 15
  const atencao = minutos >= 8

  async function onAvancar() {
    setOcupado(true)
    setErro(null)
    const { erro: e } = await avancarStatus(card.sub.id, status)
    setOcupado(false)
    if (e) setErro(e)
  }

  async function onEsgotarItem(it: PedidoItem) {
    if (!confirm(`Esgotar "${it.nome_snapshot}" no cardápio?`)) return
    setMenuAberto(null)
    const { erro: e } = await esgotarItem(it.item_id)
    if (e) setErro(e)
  }

  async function onEsgotarSabor(v: ItemVariacao, nomeItem: string) {
    if (!confirm(`Esgotar apenas o sabor "${v.nome}" de ${nomeItem}?`)) return
    setMenuAberto(null)
    const { erro: e } = await esgotarVariacao(v.id)
    if (e) setErro(e)
  }

  return (
    <article
      className="bg-white rounded-lg shadow-sm border-l-4 p-3"
      style={{ borderColor: cor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide" style={{ color: cor }}>
            {setor?.nome ?? 'Setor'}
          </p>
          <p className="text-2xl font-bold text-arraia-brown-dark leading-none">
            {card.sub.senha ?? '—'}
          </p>
        </div>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            urgente
              ? 'bg-red-100 text-red-700'
              : atencao
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          {minutos} min
        </span>
      </div>

      <ul className="mt-2 space-y-1 text-sm">
        {card.itens.map((it) => {
          const variacoes = variacoesPorItem[it.item_id] ?? []
          const menuId = it.id
          const aberto = menuAberto === menuId
          return (
            <li
              key={it.id}
              className="border-b border-arraia-cream last:border-0 pb-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-arraia-brown-dark">
                    <span className="font-bold">{it.quantidade}×</span>{' '}
                    {it.nome_snapshot}
                    {it.variacao_snapshot && (
                      <span className="text-arraia-brown/60">
                        {' '}
                        ({it.variacao_snapshot})
                      </span>
                    )}
                  </p>
                  {it.observacao && (
                    <p className="text-[11px] text-arraia-brown/60 italic">
                      obs: {it.observacao}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setMenuAberto(aberto ? null : menuId)}
                  title="Esgotar item ou sabor"
                  className="text-[10px] text-arraia-red hover:underline shrink-0"
                >
                  esgotar ▾
                </button>
              </div>
              {aberto && (
                <div className="mt-1 ml-2 bg-arraia-cream/60 rounded p-2 space-y-1">
                  <button
                    onClick={() => onEsgotarItem(it)}
                    className="block w-full text-left text-xs text-arraia-brown-dark hover:bg-arraia-cream rounded px-2 py-1"
                  >
                    Esgotar {it.nome_snapshot} inteiro
                  </button>
                  {variacoes
                    .filter((v) => v.disponivel)
                    .map((v) => (
                      <button
                        key={v.id}
                        onClick={() => onEsgotarSabor(v, it.nome_snapshot)}
                        className="block w-full text-left text-xs text-arraia-brown-dark hover:bg-arraia-cream rounded px-2 py-1"
                      >
                        Esgotar sabor: <b>{v.nome}</b>
                      </button>
                    ))}
                  <button
                    onClick={() => setMenuAberto(null)}
                    className="block w-full text-left text-[10px] text-arraia-brown/60 hover:bg-arraia-cream rounded px-2 py-1"
                  >
                    cancelar
                  </button>
                </div>
              )}
            </li>
          )
        })}
        {card.itens.length === 0 && (
          <li className="text-xs text-arraia-brown/50">carregando itens…</li>
        )}
      </ul>

      {erro && <p className="mt-2 text-xs text-arraia-red">{erro}</p>}

      <button
        onClick={onAvancar}
        disabled={ocupado}
        className="mt-3 w-full bg-arraia-brown-dark text-arraia-cream font-bold py-2 rounded-md disabled:opacity-60 text-sm"
      >
        {ocupado ? '...' : acao}
      </button>
    </article>
  )
}
