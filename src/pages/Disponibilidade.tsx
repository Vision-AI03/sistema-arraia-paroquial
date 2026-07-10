import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Categoria, Item, ItemVariacao, Setor } from '../types'

type ItemComVar = Item & { variacoes: ItemVariacao[] }

export default function Disponibilidade() {
  const { perfil, sair } = useAuth()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [itens, setItens] = useState<ItemComVar[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [busca, setBusca] = useState('')
  const [mostrarEsgotados, setMostrarEsgotados] = useState(true)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    async function carregar() {
      const [catRes, itRes, varRes, setRes] = await Promise.all([
        supabase
          .from('categorias')
          .select('id, nome, ordem, ativo, setor_id')
          .order('ordem'),
        supabase
          .from('itens')
          .select(
            'id, categoria_id, nome, descricao, preco, disponivel, alcoolico, ordem'
          )
          .order('ordem'),
        supabase
          .from('item_variacoes')
          .select('id, item_id, nome, disponivel, ordem')
          .order('ordem'),
        supabase
          .from('setores')
          .select('id, nome, prefixo_senha, cor, ordem, ativo')
          .order('ordem'),
      ])
      if (cancelado) return
      if (catRes.error || itRes.error || varRes.error || setRes.error) {
        setErro(
          catRes.error?.message ??
            itRes.error?.message ??
            varRes.error?.message ??
            setRes.error?.message ??
            'erro'
        )
        setCarregando(false)
        return
      }
      const varPorItem = new Map<string, ItemVariacao[]>()
      for (const v of (varRes.data ?? []) as ItemVariacao[]) {
        ;(varPorItem.get(v.item_id) ?? varPorItem.set(v.item_id, []).get(v.item_id)!).push(v)
      }
      setCategorias((catRes.data ?? []) as Categoria[])
      setItens(
        ((itRes.data ?? []) as Item[]).map((it) => ({
          ...it,
          preco: Number(it.preco),
          variacoes: varPorItem.get(it.id) ?? [],
        }))
      )
      setSetores((setRes.data ?? []) as Setor[])
      setCarregando(false)
    }
    carregar()

    const canal = supabase
      .channel('disponibilidade')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'itens' },
        (p) => {
          const novo = p.new as Item
          setItens((old) =>
            old.map((it) =>
              it.id === novo.id ? { ...it, disponivel: novo.disponivel } : it
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'item_variacoes' },
        (p) => {
          const novo = p.new as ItemVariacao
          setItens((old) =>
            old.map((it) =>
              it.id === novo.item_id
                ? {
                    ...it,
                    variacoes: it.variacoes.map((v) =>
                      v.id === novo.id ? { ...v, disponivel: novo.disponivel } : v
                    ),
                  }
                : it
            )
          )
        }
      )
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [])

  const setoresPorId = useMemo(
    () => new Map(setores.map((s) => [s.id, s])),
    [setores]
  )
  const catsPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c])),
    [categorias]
  )

  const agrupado = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtrados = itens.filter((it) => {
      if (!mostrarEsgotados && !it.disponivel) return false
      if (termo && !it.nome.toLowerCase().includes(termo)) return false
      return true
    })
    const mapa = new Map<string, ItemComVar[]>()
    for (const it of filtrados) {
      const lista = mapa.get(it.categoria_id) ?? []
      lista.push(it)
      mapa.set(it.categoria_id, lista)
    }
    return categorias
      .map((c) => ({ cat: c, itens: mapa.get(c.id) ?? [] }))
      .filter((g) => g.itens.length > 0)
  }, [itens, categorias, busca, mostrarEsgotados])

  async function toggleItem(it: ItemComVar) {
    setSalvando(it.id)
    const { error } = await supabase
      .from('itens')
      .update({ disponivel: !it.disponivel })
      .eq('id', it.id)
    setSalvando(null)
    if (error) setErro(error.message)
  }

  async function toggleVariacao(v: ItemVariacao) {
    setSalvando(v.id)
    const { error } = await supabase
      .from('item_variacoes')
      .update({ disponivel: !v.disponivel })
      .eq('id', v.id)
    setSalvando(null)
    if (error) setErro(error.message)
  }

  const voltar = perfil?.papel === 'cozinha' ? '/cozinha' : '/admin'

  return (
    <div className="min-h-screen bg-arraia-cream">
      <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <Link to={voltar} className="text-xs opacity-80 hover:opacity-100">
            ← voltar
          </Link>
          <h1 className="font-bold">Disponibilidade do cardápio</h1>
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
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar item…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 min-w-[180px] rounded-md border border-arraia-brown/30 px-3 py-2 text-sm"
          />
          <label className="text-sm text-arraia-brown-dark flex items-center gap-2">
            <input
              type="checkbox"
              checked={mostrarEsgotados}
              onChange={(e) => setMostrarEsgotados(e.target.checked)}
            />
            mostrar esgotados
          </label>
        </div>

        {erro && <p className="text-arraia-red text-sm">Erro: {erro}</p>}
        {carregando && (
          <p className="text-center text-arraia-brown/70 py-6">Carregando…</p>
        )}

        {agrupado.map(({ cat, itens }) => {
          const setor = cat.setor_id ? setoresPorId.get(cat.setor_id) : null
          return (
            <section key={cat.id} className="bg-white rounded-xl shadow-sm p-4">
              <header className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-arraia-brown-dark">{cat.nome}</h2>
                {setor && (
                  <span
                    className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: (setor.cor ?? '#4E342E') + '22',
                      color: setor.cor ?? '#4E342E',
                    }}
                  >
                    {setor.nome}
                  </span>
                )}
              </header>
              <ul className="divide-y divide-arraia-cream">
                {itens.map((it) => (
                  <li key={it.id} className="py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          className={`font-semibold ${
                            it.disponivel
                              ? 'text-arraia-brown-dark'
                              : 'text-arraia-brown/50 line-through'
                          }`}
                        >
                          {it.nome}
                        </p>
                        {catsPorId.get(it.categoria_id) && (
                          <p className="text-[11px] text-arraia-brown/50">
                            R$ {it.preco.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleItem(it)}
                        disabled={salvando === it.id}
                        className={`text-xs font-bold px-3 py-1 rounded-md shrink-0 ${
                          it.disponivel
                            ? 'bg-arraia-red text-white'
                            : 'bg-green-700 text-white'
                        } disabled:opacity-60`}
                      >
                        {salvando === it.id
                          ? '...'
                          : it.disponivel
                            ? 'Esgotar'
                            : 'Religar'}
                      </button>
                    </div>
                    {it.variacoes.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5 pl-2">
                        {it.variacoes.map((v) => (
                          <li key={v.id}>
                            <button
                              onClick={() => toggleVariacao(v)}
                              disabled={salvando === v.id}
                              className={
                                'text-xs px-2 py-0.5 rounded-full border transition ' +
                                (v.disponivel
                                  ? 'bg-arraia-cream border-arraia-gold/60 text-arraia-brown-dark hover:bg-arraia-gold/20'
                                  : 'bg-gray-100 border-gray-300 text-gray-500 line-through hover:bg-gray-200')
                              }
                            >
                              {v.nome}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {!carregando && agrupado.length === 0 && (
          <p className="text-center text-arraia-brown/60 py-6">Nada a mostrar.</p>
        )}
      </main>
    </div>
  )
}
