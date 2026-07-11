import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCardapio } from '../hooks/useCardapio'
import { useCarrinho } from '../hooks/useCarrinho'
import { ItemCard } from '../components/ItemCard'
import { Carrinho } from '../components/Carrinho'
import { Toast } from '../components/Toast'
import { Bandeirinhas } from '../components/Bandeirinhas'
import { supabase } from '../lib/supabase'
import logoPng from '../assets/logo-santo.png'
import logoWebp from '../assets/logo-santo.webp'
import type { Item, ItemVariacao } from '../types'

const CORES_CATEGORIA = ['#C0392B', '#E8B923', '#4E9A51', '#2E86C1', '#E67E22']

export default function Cardapio() {
  const navigate = useNavigate()
  const { categorias, carregando: carregandoCardapio, erro } = useCardapio()
  const { itens, adicionar, remover, limpar, total, quantidadeTotal } =
    useCarrinho()
  const [toast, setToast] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function handleAdicionar(item: Item, variacao: ItemVariacao | null) {
    if (!item.disponivel) return
    adicionar(item, variacao)
    const nomeExibido = variacao ? `${item.nome} (${variacao.nome})` : item.nome
    setToast(`${nomeExibido} adicionado`)
  }

  function reAdicionar(item_id: string, variacao_id: string | null) {
    const atual = itens.find(
      (i) => i.item_id === item_id && i.variacao_id === variacao_id
    )
    if (!atual) return
    adicionar(
      {
        id: atual.item_id,
        nome: atual.nome,
        preco: atual.preco,
        categoria_id: '',
        descricao: null,
        disponivel: true,
        alcoolico: false,
        ordem: 0,
      },
      variacao_id
        ? { id: variacao_id, item_id, nome: atual.variacao_nome ?? '', disponivel: true, ordem: 0 }
        : null
    )
  }

  async function handleFinalizar() {
    if (itens.length === 0 || enviando) return
    setEnviando(true)
    const payload = {
      itens: itens.map((i) => ({
        item_id: i.item_id,
        variacao_id: i.variacao_id,
        quantidade: i.quantidade,
      })),
    }
    const { data, error } = await supabase.rpc('criar_pedido', { payload })
    setEnviando(false)
    if (error || !data) {
      setToast(`Erro ao criar pedido: ${error?.message ?? 'desconhecido'}`)
      return
    }
    limpar()
    navigate(`/checkout/${data as string}`)
  }

  return (
    <div className="min-h-screen pb-28 bg-arraia-cream">
      <header className="sticky top-0 z-20 bg-arraia-brown-dark shadow-md">
        <div className="max-w-xl mx-auto px-4 pt-2 pb-1 flex items-center gap-3">
          <picture>
            <source srcSet={logoWebp} type="image/webp" />
            <img
              src={logoPng}
              alt="São Sebastião"
              className="block h-[72px] sm:h-[96px] w-auto shrink-0"
              width={240}
              height={250}
              decoding="async"
            />
          </picture>
          <div className="min-w-0 flex-1">
            <h1
              className="text-arraia-cream font-bold leading-tight text-[20px] sm:text-[24px]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              São Sebastião
            </h1>
            <p className="text-arraia-gold text-[11px] sm:text-xs leading-snug mt-0.5">
              Paróquia N. S. da Conceição – Ipeúna/SP
              <br />
              <span className="opacity-90">18, 19, 25 e 26 de Julho</span>
            </p>
          </div>
        </div>
        <Bandeirinhas />
      </header>

      <main className="max-w-xl mx-auto px-4 py-4">
        {erro && (
          <div className="bg-red-100 border border-arraia-red/40 text-arraia-red rounded-lg p-3 mb-4 text-sm">
            Não foi possível carregar o cardápio. Verifique sua conexão.
          </div>
        )}

        {carregandoCardapio && (
          <p className="text-center text-arraia-brown/70 py-10">
            Carregando cardápio…
          </p>
        )}

        {!carregandoCardapio && categorias.length === 0 && !erro && (
          <p className="text-center text-arraia-brown/70 py-10">
            Nenhum item disponível no momento.
          </p>
        )}

        <div className="space-y-6">
          {categorias.map((cat, idx) => (
            <section key={cat.id}>
              <h2 className="text-xl font-bold text-arraia-brown-dark mb-2 flex items-center gap-2">
                <span
                  className="inline-block w-1.5 h-6 rounded-sm"
                  style={{
                    backgroundColor:
                      CORES_CATEGORIA[idx % CORES_CATEGORIA.length],
                  }}
                />
                {cat.nome}
              </h2>
              <div className="space-y-3">
                {cat.itens.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onAdicionar={handleAdicionar}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Carrinho
        itens={itens}
        total={total}
        quantidadeTotal={quantidadeTotal}
        onAdicionar={reAdicionar}
        onRemover={remover}
        onFinalizar={handleFinalizar}
      />

      <Toast mensagem={toast} onFechar={() => setToast(null)} />
    </div>
  )
}
