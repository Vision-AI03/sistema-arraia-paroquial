import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAtendimento } from '../hooks/useAtendimento'
import type { ConfiguracaoAtendimento } from '../types'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function rotuloData(data: string) {
  const [, mes, dia] = data.split('-').map(Number)
  return `${dia} de ${MESES[mes - 1]}`
}

export default function AdminHorarios() {
  const { perfil, sair } = useAuth()
  const { status } = useAtendimento()
  const [dias, setDias] = useState<ConfiguracaoAtendimento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const { data, error } = await supabase
        .from('configuracao_atendimento')
        .select('data, abre, fecha, aberto_manual')
        .order('data')
      if (cancelado) return
      if (error) setErro(error.message)
      else setDias((data ?? []) as ConfiguracaoAtendimento[])
      setCarregando(false)
    }
    carregar()

    const canal = supabase
      .channel('admin-horarios')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'configuracao_atendimento' },
        () => carregar()
      )
      .subscribe()
    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [])

  async function salvar(dia: ConfiguracaoAtendimento) {
    setSalvando(dia.data)
    setErro(null)
    const { error } = await supabase
      .from('configuracao_atendimento')
      .update({
        abre: dia.abre,
        fecha: dia.fecha,
        aberto_manual: dia.aberto_manual,
      })
      .eq('data', dia.data)
    setSalvando(null)
    if (error) setErro(error.message)
    else {
      setToast('Salvo')
      setTimeout(() => setToast(null), 1200)
    }
  }

  function editar(data: string, patch: Partial<ConfiguracaoAtendimento>) {
    setDias((old) =>
      old.map((d) => (d.data === data ? { ...d, ...patch } : d))
    )
  }

  async function pausarTudo() {
    if (!confirm('Pausar pedidos agora em todos os dias configurados?')) return
    setErro(null)
    const { error } = await supabase
      .from('configuracao_atendimento')
      .update({ aberto_manual: false })
      .in('data', dias.map((d) => d.data))
    if (error) setErro(error.message)
  }

  async function reabrirTudo() {
    setErro(null)
    const { error } = await supabase
      .from('configuracao_atendimento')
      .update({ aberto_manual: true })
      .in('data', dias.map((d) => d.data))
    if (error) setErro(error.message)
  }

  const algumFechadoManual = dias.some((d) => !d.aberto_manual)

  return (
    <div className="min-h-screen bg-arraia-cream">
      <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link to="/admin" className="text-xs opacity-80 hover:opacity-100 block">
            ← voltar
          </Link>
          <h1 className="font-bold text-lg">Horários de atendimento</h1>
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
        <section
          className={
            'rounded-xl p-4 text-center shadow ' +
            (status?.aberto
              ? 'bg-green-100 border border-green-300'
              : 'bg-red-100 border border-red-300')
          }
        >
          <p className="font-bold text-lg">
            {status?.aberto ? '✓ Pedidos abertos' : '⏸ Pedidos fechados'}
          </p>
          <div className="mt-3 flex gap-2 justify-center flex-wrap">
            {algumFechadoManual ? (
              <button
                onClick={reabrirTudo}
                className="bg-green-700 text-white font-bold px-4 py-2 rounded-md text-sm"
              >
                Reabrir pedidos
              </button>
            ) : (
              <button
                onClick={pausarTudo}
                className="bg-arraia-red text-white font-bold px-4 py-2 rounded-md text-sm"
              >
                Pausar pedidos agora
              </button>
            )}
          </div>
        </section>

        {erro && <p className="text-arraia-red text-sm">{erro}</p>}
        {carregando && (
          <p className="text-center text-arraia-brown/70">Carregando…</p>
        )}

        <ul className="space-y-2">
          {dias.map((d) => (
            <li key={d.data} className="bg-white rounded-lg shadow-sm p-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-arraia-brown-dark">
                    {rotuloData(d.data)}
                  </p>
                  <p className="text-[11px] text-arraia-brown/60">{d.data}</p>
                </div>
                <label className="text-xs text-arraia-brown-dark flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={d.aberto_manual}
                    onChange={(e) =>
                      editar(d.data, { aberto_manual: e.target.checked })
                    }
                  />
                  aberto
                </label>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <label className="text-sm text-arraia-brown-dark flex items-center gap-1">
                  abre
                  <input
                    type="time"
                    value={d.abre.slice(0, 5)}
                    onChange={(e) => editar(d.data, { abre: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </label>
                <label className="text-sm text-arraia-brown-dark flex items-center gap-1">
                  fecha
                  <input
                    type="time"
                    value={d.fecha.slice(0, 5)}
                    onChange={(e) => editar(d.data, { fecha: e.target.value })}
                    className="border rounded px-2 py-1 text-sm"
                  />
                </label>
                <button
                  onClick={() => salvar(d)}
                  disabled={salvando === d.data}
                  className="ml-auto bg-arraia-brown-dark text-arraia-cream text-xs font-bold px-3 py-1.5 rounded-md disabled:opacity-60"
                >
                  {salvando === d.data ? '...' : 'Salvar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-arraia-brown-dark text-arraia-cream px-4 py-2 rounded-full shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  )
}
