import { useState } from 'react'
import { useMesa } from './hooks/useMesa'
import { useCardapio } from './hooks/useCardapio'
import { useCarrinho } from './hooks/useCarrinho'
import { ItemCard } from './components/ItemCard'
import { Carrinho } from './components/Carrinho'
import { Toast } from './components/Toast'
import { Bandeirinhas } from './components/Bandeirinhas'
import logoPng from './assets/logo-santo.png'
import logoWebp from './assets/logo-santo.webp'
import type { Item } from './types'

const CORES_CATEGORIA = ['#C0392B', '#E8B923', '#4E9A51', '#2E86C1', '#E67E22']

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
        <div className="max-w-xl mx-auto px-4 flex justify-end -mt-2 pb-1.5">
          {carregandoMesa ? (
            <span className="text-[10px] text-arraia-cream/70">…</span>
          ) : mesa ? (
            <span className="inline-block bg-arraia-gold text-arraia-brown-dark font-bold px-3 py-0.5 rounded-full text-xs shadow border border-arraia-gold-dark">
              Mesa {mesa.numero}
            </span>
          ) : (
            <span className="inline-block bg-arraia-cream text-arraia-brown-dark font-semibold px-3 py-0.5 rounded-full text-[11px] shadow">
              Modo balcão
            </span>
          )}
        </div>
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

export default App
