import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatBRL } from '../utils/format'

type FaturamentoDia = {
  dia: string
  pedidos_pagos: number
  faturamento: number
  ticket_medio: number
}

type FaturamentoSetorDia = {
  dia: string
  setor_id: string
  setor: string
  sub_pedidos: number
  faturamento: number
}

type TopItem = {
  item_id: string
  nome: string
  setor: string
  qtd_vendida: number
  receita: number
}

function diaSP(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  })
}

function hojeSP(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  })
}

export default function AdminFaturamento() {
  const { perfil, sair } = useAuth()
  const [dias, setDias] = useState<FaturamentoDia[]>([])
  const [porSetor, setPorSetor] = useState<FaturamentoSetorDia[]>([])
  const [topItens, setTopItens] = useState<TopItem[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      const [d, s, t] = await Promise.all([
        supabase.from('faturamento_dia').select('*').limit(14),
        supabase.from('faturamento_setor_dia').select('*').limit(60),
        supabase.from('top_itens_7d').select('*').limit(15),
      ])
      if (cancelado) return
      if (d.error) setErro(d.error.message)
      else if (s.error) setErro(s.error.message)
      else if (t.error) setErro(t.error.message)
      else {
        setDias(
          (d.data ?? []).map((r) => ({
            ...(r as FaturamentoDia),
            faturamento: Number((r as FaturamentoDia).faturamento),
            ticket_medio: Number((r as FaturamentoDia).ticket_medio),
          }))
        )
        setPorSetor(
          (s.data ?? []).map((r) => ({
            ...(r as FaturamentoSetorDia),
            faturamento: Number((r as FaturamentoSetorDia).faturamento),
          }))
        )
        setTopItens(
          (t.data ?? []).map((r) => ({
            ...(r as TopItem),
            qtd_vendida: Number((r as TopItem).qtd_vendida),
            receita: Number((r as TopItem).receita),
          }))
        )
      }
      setCarregando(false)
    }

    carregar()

    const canal = supabase
      .channel('admin-faturamento')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos' },
        () => carregar()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        () => carregar()
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [])

  const hoje = hojeSP()
  const linhaHoje = dias.find((d) => diaSP(d.dia) === hoje)
  const setoresHoje = porSetor.filter((s) => diaSP(s.dia) === hoje)
  const historico = dias.filter((d) => diaSP(d.dia) !== hoje).slice(0, 7)
  const totalSetor = setoresHoje.reduce((acc, s) => acc + s.faturamento, 0)

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
          <h1 className="font-bold text-lg">Faturamento</h1>
          <p className="text-xs opacity-80">Olá, {perfil?.nome}</p>
        </div>
        <button
          onClick={sair}
          className="text-xs bg-arraia-cream/10 hover:bg-arraia-cream/20 rounded px-3 py-1"
        >
          Sair
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        {erro && <p className="text-arraia-red text-sm">{erro}</p>}
        {carregando && (
          <p className="text-center text-arraia-brown/70">Carregando…</p>
        )}

        <section>
          <h2 className="text-sm uppercase tracking-wide text-arraia-brown/70 mb-2">
            Hoje ({hoje})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-arraia-gold">
              <p className="text-xs text-arraia-brown/70">Faturamento</p>
              <p className="text-2xl font-bold text-arraia-brown-dark">
                {formatBRL(linhaHoje?.faturamento ?? 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-arraia-red">
              <p className="text-xs text-arraia-brown/70">Pedidos pagos</p>
              <p className="text-2xl font-bold text-arraia-brown-dark">
                {linhaHoje?.pedidos_pagos ?? 0}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-arraia-brown-dark">
              <p className="text-xs text-arraia-brown/70">Ticket médio</p>
              <p className="text-2xl font-bold text-arraia-brown-dark">
                {formatBRL(linhaHoje?.ticket_medio ?? 0)}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-arraia-brown/70 mb-2">
            Por setor — hoje
          </h2>
          {setoresHoje.length === 0 ? (
            <p className="bg-white rounded-xl shadow-sm p-4 text-sm text-arraia-brown/60">
              Sem vendas registradas hoje.
            </p>
          ) : (
            <ul className="bg-white rounded-xl shadow-sm divide-y">
              {setoresHoje.map((s) => {
                const pct =
                  totalSetor > 0 ? (s.faturamento / totalSetor) * 100 : 0
                return (
                  <li key={s.setor_id} className="p-3">
                    <div className="flex justify-between items-baseline gap-2">
                      <div>
                        <p className="font-semibold text-arraia-brown-dark">
                          {s.setor}
                        </p>
                        <p className="text-xs text-arraia-brown/60">
                          {s.sub_pedidos} sub-pedido(s)
                        </p>
                      </div>
                      <p className="font-bold text-arraia-brown-dark">
                        {formatBRL(s.faturamento)}
                      </p>
                    </div>
                    <div className="mt-2 h-2 bg-arraia-cream rounded overflow-hidden">
                      <div
                        className="h-full bg-arraia-gold"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-arraia-brown/60 mt-1">
                      {pct.toFixed(1)}% do dia
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-arraia-brown/70 mb-2">
            Top itens (últimos 7 dias)
          </h2>
          {topItens.length === 0 ? (
            <p className="bg-white rounded-xl shadow-sm p-4 text-sm text-arraia-brown/60">
              Sem vendas nos últimos 7 dias.
            </p>
          ) : (
            <ul className="bg-white rounded-xl shadow-sm divide-y">
              {topItens.map((it, i) => (
                <li
                  key={it.item_id}
                  className="p-3 flex justify-between items-center gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-arraia-brown/40 font-mono text-sm w-6 text-right">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-arraia-brown-dark truncate">
                        {it.nome}
                      </p>
                      <p className="text-xs text-arraia-brown/60">
                        {it.setor} • {it.qtd_vendida} unidade(s)
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-arraia-brown-dark whitespace-nowrap">
                    {formatBRL(it.receita)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-arraia-brown/70 mb-2">
            Histórico
          </h2>
          {historico.length === 0 ? (
            <p className="bg-white rounded-xl shadow-sm p-4 text-sm text-arraia-brown/60">
              Sem dias anteriores registrados.
            </p>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-arraia-cream text-arraia-brown/70">
                  <tr>
                    <th className="text-left px-3 py-2">Dia</th>
                    <th className="text-right px-3 py-2">Pedidos</th>
                    <th className="text-right px-3 py-2">Ticket</th>
                    <th className="text-right px-3 py-2">Faturamento</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((d) => (
                    <tr key={d.dia} className="border-t">
                      <td className="px-3 py-2">{diaSP(d.dia)}</td>
                      <td className="px-3 py-2 text-right">
                        {d.pedidos_pagos}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatBRL(d.ticket_medio)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatBRL(d.faturamento)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
