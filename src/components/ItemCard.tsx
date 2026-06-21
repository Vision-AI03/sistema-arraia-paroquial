import type { Item } from '../types'
import { formatBRL } from '../utils/format'

type Props = {
  item: Item
  onAdicionar: (item: Item) => void
}

export function ItemCard({ item, onAdicionar }: Props) {
  const variacoes = item.variacoes ?? []

  return (
    <article className="bg-white rounded-xl p-4 shadow-sm border border-arraia-gold/40">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base text-arraia-brown-dark leading-tight">
              {item.nome}
            </h3>
            {item.alcoolico && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-arraia-red text-arraia-cream px-1.5 py-0.5 rounded-md border border-arraia-gold/60">
                18+
              </span>
            )}
          </div>
          {item.descricao && (
            <p className="text-sm text-arraia-brown/80 mt-1 leading-snug">
              {item.descricao}
            </p>
          )}
          {variacoes.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {variacoes.map((v) => (
                <li
                  key={v.id}
                  className={
                    'text-xs px-2 py-0.5 rounded-full border ' +
                    (v.disponivel
                      ? 'bg-arraia-cream border-arraia-gold/60 text-arraia-brown-dark'
                      : 'bg-gray-100 border-gray-300 text-gray-500 line-through')
                  }
                  title={v.disponivel ? v.nome : `${v.nome} (esgotado)`}
                >
                  {v.nome}
                  {!v.disponivel && (
                    <span className="ml-1 no-underline font-semibold">
                      esgotado
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="font-extrabold text-arraia-red mt-2 text-lg">
            {formatBRL(item.preco)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAdicionar(item)}
          aria-label={`Adicionar ${item.nome}`}
          className="shrink-0 w-12 h-12 rounded-full bg-arraia-gold text-arraia-brown-dark text-3xl font-bold flex items-center justify-center shadow-md border-2 border-arraia-gold-dark active:scale-95 transition"
        >
          +
        </button>
      </div>
    </article>
  )
}
