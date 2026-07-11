import { useState } from 'react'
import type { CarrinhoItem } from '../types'
import { formatBRL } from '../utils/format'

type Props = {
  itens: CarrinhoItem[]
  total: number
  quantidadeTotal: number
  pedidosAbertos?: boolean
  onAdicionar: (item_id: string) => void
  onRemover: (item_id: string) => void
  onFinalizar: () => void
}

export function Carrinho({
  itens,
  total,
  quantidadeTotal,
  pedidosAbertos = true,
  onAdicionar,
  onRemover,
  onFinalizar,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const vazio = quantidadeTotal === 0

  return (
    <>
      <button
        type="button"
        onClick={() => !vazio && setAberto(true)}
        disabled={vazio}
        className={
          'fixed bottom-4 left-4 right-4 z-30 rounded-full px-5 py-3 shadow-lg flex items-center justify-between gap-3 transition border-2 ' +
          (vazio
            ? 'bg-gray-300 text-gray-500 border-gray-300'
            : 'bg-arraia-brown-dark text-arraia-cream border-arraia-gold active:scale-[0.98]')
        }
      >
        <span className="flex items-center gap-2 font-semibold">
          <span className="bg-arraia-gold text-arraia-brown-dark rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
            {quantidadeTotal}
          </span>
          Ver carrinho
        </span>
        <span className="font-bold text-arraia-gold">{formatBRL(total)}</span>
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 flex items-end"
          onClick={() => setAberto(false)}
        >
          <div
            className="bg-arraia-cream w-full max-h-[85vh] rounded-t-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-arraia-gold/50 flex items-center justify-between bg-arraia-brown-dark text-arraia-cream rounded-t-2xl">
              <h2 className="font-bold text-lg">Seu pedido</h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-arraia-cream text-2xl leading-none px-2"
                aria-label="Fechar carrinho"
              >
                ×
              </button>
            </div>

            <ul className="flex-1 overflow-y-auto p-4 space-y-3">
              {itens.map((it) => (
                <li
                  key={it.item_id}
                  className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-arraia-brown-dark truncate">
                      {it.nome}
                    </p>
                    <p className="text-sm text-arraia-brown/80">
                      {formatBRL(it.preco)} cada
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onRemover(it.item_id)}
                      aria-label="Diminuir"
                      className="w-9 h-9 rounded-full bg-arraia-cream border-2 border-arraia-gold-dark text-arraia-brown-dark font-bold text-lg active:scale-95"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold text-arraia-brown-dark">
                      {it.quantidade}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdicionar(it.item_id)}
                      aria-label="Aumentar"
                      className="w-9 h-9 rounded-full bg-arraia-gold border-2 border-arraia-gold-dark text-arraia-brown-dark font-bold text-lg active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="p-4 border-t border-arraia-gold/50 space-y-3 bg-white/70">
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold text-arraia-brown-dark">
                  Total
                </span>
                <span className="font-extrabold text-arraia-red">
                  {formatBRL(total)}
                </span>
              </div>
              <button
                type="button"
                onClick={onFinalizar}
                disabled={!pedidosAbertos}
                className={
                  'w-full font-bold py-3 rounded-full shadow border-2 active:scale-[0.98] ' +
                  (pedidosAbertos
                    ? 'bg-arraia-red text-arraia-cream border-arraia-gold'
                    : 'bg-gray-400 text-gray-100 border-gray-500 cursor-not-allowed')
                }
              >
                {pedidosAbertos ? 'Finalizar pedido' : 'Pedidos fechados'}
              </button>
              <p className="text-xs text-center text-arraia-brown/80">
                {pedidosAbertos
                  ? 'Uma senha por barraca — dá pra retirar aos poucos.'
                  : 'Voltamos no próximo horário de atendimento.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
