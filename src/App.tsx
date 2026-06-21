import { useState } from 'react'
import { useMesa } from './hooks/useMesa'
import { useCardapio } from './hooks/useCardapio'
import { useCarrinho } from './hooks/useCarrinho'
import { ItemCard } from './components/ItemCard'
import { Carrinho } from './components/Carrinho'
import { Toast } from './components/Toast'
import { Bandeirinhas } from './components/Bandeirinhas'
import logoPng from './assets/logo-sao-sebastiao.png'
import logoWebp from './assets/logo-sao-sebastiao.webp'
import type { Item } from './types'

function App() {
  const { mesa, carregando: carregandoMesa } = useMesa()
  const { categorias, carregando: carregandoCardapio, erro } = useCardapio()
  const { itens, adicionar, remover, total, quantidadeTotal } = useCarrinho()
  const [toast, setToast] = useState<string | null>(null)

  function handleAdicionar(item: Item) {
    adicionar(item)
    setToast(`${item.nome} adicionado`)
  }

  function reAdicionar(item_id: string) {
    const atual = itens.find((i) => i.item_id === item_id)
    if (!atual) return
    adicionar({
      id: atual.item_id,
      nome: atual.nome,
      preco: atual.preco,
      categoria_id: '',
      descricao: null,
      disponivel: true,
      alcoolico: false,
      ordem: 0,
    })
  }

  function handleFinalizar() {
    setToast('Pagamento entra na próxima fase 🙏')
  }

  return (
    <div className="min-h-screen pb-28 bg-arraia-cream">
      <header className="sticky top-0 z-20 bg-arraia-brown-dark text-arraia-cream shadow-md">
        <div className="max-w-xl mx-auto px-4 pt-3 pb-2 flex flex-col items-center">
          <picture>
            <source srcSet={logoWebp} type="image/webp" />
            <img
              src={logoPng}
              alt="136ª Festa em Louvor a São Sebastião — Paróquia N. Sra. da Conceição, Ipeúna/SP"
              className="block w-full max-w-[360px] h-auto"
              width={720}
              height={960}
              decoding="async"
            />
          </picture>
          <div className="mt-2 mb-1">
            {carregandoMesa ? (
              <span className="text-xs opacity-80">…</span>
            ) : mesa ? (
              <span className="inline-block bg-arraia-gold text-arraia-brown-dark font-bold px-4 py-1 rounded-full text-sm shadow">
                Mesa {mesa.numero}
              </span>
            ) : (
              <span className="inline-block bg-arraia-cream/90 text-arraia-brown-dark font-semibold px-3 py-1 rounded-full text-xs">
                Modo balcão
              </span>
            )}
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
          {categorias.map((cat) => (
            <section key={cat.id}>
              <h2 className="text-xl font-bold text-arraia-brown-dark mb-2 flex items-center gap-2">
                <span className="inline-block w-2 h-6 bg-arraia-gold rounded-sm" />
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

export default App
