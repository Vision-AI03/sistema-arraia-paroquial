import type { Item } from '../types'
import { formatBRL } from '../utils/format'

type Props = {
  item: Item
  onAdicionar: (item: Item) => void
}

export function ItemCard({ item, onAdicionar }: Props) {
  const variacoes = item.variacoes ?? []
  const temVariacao = variacoes.length > 0
  const todasVariacoesEsgotadas =
    temVariacao && variacoes.every((v) => !v.disponivel)
  const esgotado = !item.disponivel || todasVariacoesEsgotadas

  return (
    <article
      className={
        'rounded-xl p-4 shadow-sm border transition ' +
        (esgotado
          ? 'bg-gray-100 border-gray-300 opacity-70'
          : 'bg-white border-arraia-gold/40')
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={
                'font-semibold text-base leading-tight ' +
                (esgotado
                  ? 'text-arraia-brown/50 line-through'
                  : 'text-arraia-brown-dark')
              }
            >
              {item.nome}
            </h3>
            {item.alcoolico && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-arraia-red text-arraia-cream px-1.5 py-0.5 rounded-md border border-arraia-gold/60">
                18+
              </span>
            )}
            {esgotado && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-arraia-brown/80 text-arraia-cream px-1.5 py-0.5 rounded-md">
                esgotado
              </span>
            )}
          </div>
          {item.descricao && (
            <p
              className={
                'text-sm mt-1 leading-snug ' +
                (esgotado ? 'text-arraia-brown/40' : 'text-arraia-brown/80')
              }
            >
              {item.descricao}
            </p>
          )}
          {temVariacao && (
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
          <p
            className={
              'font-extrabold mt-2 text-lg ' +
              (esgotado ? 'text-arraia-brown/50' : 'text-arraia-red')
            }
          >
            {formatBRL(item.preco)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAdicionar(item)}
          disabled={esgotado}
          aria-label={
            esgotado
              ? `${item.nome} esgotado`
              : `Adicionar ${item.nome}`
          }
          className={
            'shrink-0 w-12 h-12 rounded-full text-3xl font-bold flex items-center justify-center shadow-md border-2 active:scale-95 transition ' +
            (esgotado
              ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
              : 'bg-arraia-gold text-arraia-brown-dark border-arraia-gold-dark')
          }
        >
          +
        </button>
      </div>
    </article>
  )
}
