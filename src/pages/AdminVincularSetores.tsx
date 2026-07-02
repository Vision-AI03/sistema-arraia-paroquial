import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Categoria, Setor } from '../types'

type Estado = {
  setores: Setor[]
  categorias: Categoria[]
  carregando: boolean
  erro: string | null
}

export default function AdminVincularSetores() {
  const [estado, setEstado] = useState<Estado>({
    setores: [],
    categorias: [],
    carregando: true,
    erro: null,
  })
  const [salvando, setSalvando] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const [setRes, catRes] = await Promise.all([
        supabase
          .from('setores')
          .select('id, nome, prefixo_senha, cor, ordem, ativo')
          .order('ordem', { ascending: true }),
        supabase
          .from('categorias')
          .select('id, nome, ordem, ativo, setor_id')
          .order('ordem', { ascending: true }),
      ])
      if (cancelado) return
      if (setRes.error || catRes.error) {
        setEstado({
          setores: [],
          categorias: [],
          carregando: false,
          erro: setRes.error?.message ?? catRes.error?.message ?? 'erro',
        })
        return
      }
      setEstado({
        setores: (setRes.data ?? []) as Setor[],
        categorias: (catRes.data ?? []) as Categoria[],
        carregando: false,
        erro: null,
      })
    })()
    return () => {
      cancelado = true
    }
  }, [])

  async function atribuir(categoriaId: string, setorId: string | null) {
    setSalvando(categoriaId)
    const { error } = await supabase
      .from('categorias')
      .update({ setor_id: setorId })
      .eq('id', categoriaId)
    setSalvando(null)
    if (error) {
      setToast(`Erro: ${error.message}`)
      return
    }
    setEstado((s) => ({
      ...s,
      categorias: s.categorias.map((c) =>
        c.id === categoriaId ? { ...c, setor_id: setorId } : c
      ),
    }))
    setToast('Vinculação salva')
    setTimeout(() => setToast(null), 1500)
  }

  const semSetor = estado.categorias.filter((c) => !c.setor_id).length

  return (
    <div className="min-h-screen bg-arraia-cream">
      <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3 flex items-center justify-between">
        <div>
          <Link
            to="/admin"
            className="text-xs opacity-80 hover:opacity-100 block"
          >
            ← voltar
          </Link>
          <h1 className="font-bold text-lg">Vincular categorias a setores</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {estado.carregando && (
          <p className="text-arraia-brown/70 text-center py-10">Carregando…</p>
        )}

        {estado.erro && (
          <p className="text-arraia-red bg-red-100 border border-arraia-red/40 rounded p-3">
            {estado.erro}
          </p>
        )}

        {!estado.carregando && !estado.erro && (
          <>
            <div className="mb-4 bg-white rounded-lg p-3 shadow-sm text-sm">
              <p className="text-arraia-brown-dark">
                {semSetor === 0 ? (
                  <span className="text-green-700 font-semibold">
                    ✓ Todas as {estado.categorias.length} categorias estão
                    vinculadas.
                  </span>
                ) : (
                  <>
                    <span className="font-semibold text-arraia-red">
                      {semSetor}
                    </span>{' '}
                    de {estado.categorias.length} categorias ainda sem setor.
                    Sem setor, o item não entra em nenhum sub-pedido.
                  </>
                )}
              </p>
            </div>

            <ul className="space-y-2">
              {estado.categorias.map((cat) => {
                const atualId = cat.setor_id
                const atual = estado.setores.find((s) => s.id === atualId)
                const editando = salvando === cat.id
                return (
                  <li
                    key={cat.id}
                    className="bg-white rounded-lg shadow-sm p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="min-w-[180px] flex-1">
                      <div className="font-semibold text-arraia-brown-dark">
                        {cat.nome}
                        {!cat.ativo && (
                          <span className="ml-2 text-xs text-arraia-brown/50">
                            (inativa)
                          </span>
                        )}
                      </div>
                      {atual ? (
                        <div className="text-xs text-arraia-brown/70">
                          Setor atual:{' '}
                          <span
                            className="font-semibold"
                            style={{ color: atual.cor ?? undefined }}
                          >
                            {atual.nome}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-arraia-red font-semibold">
                          Sem setor
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {estado.setores.map((s) => {
                        const ativo = s.id === atualId
                        return (
                          <button
                            key={s.id}
                            disabled={editando}
                            onClick={() =>
                              atribuir(cat.id, ativo ? null : s.id)
                            }
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                              ativo
                                ? 'text-white shadow'
                                : 'bg-white text-arraia-brown-dark hover:bg-arraia-cream'
                            } ${editando ? 'opacity-50' : ''}`}
                            style={
                              ativo
                                ? {
                                    backgroundColor: s.cor ?? '#4E342E',
                                    borderColor: s.cor ?? '#4E342E',
                                  }
                                : { borderColor: s.cor ?? '#4E342E' }
                            }
                            title={
                              ativo
                                ? 'Clique para remover o vínculo'
                                : `Atribuir ${s.nome}`
                            }
                          >
                            {s.nome}
                          </button>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-arraia-brown-dark text-arraia-cream px-4 py-2 rounded-full shadow-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  )
}
