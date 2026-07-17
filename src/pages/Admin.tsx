import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type Card = {
  para: string
  titulo: string
  descricao: string
  pronto: boolean
}

const CARDS: Card[] = [
  {
    para: '/admin/setores',
    titulo: 'Vincular setores',
    descricao: 'Atribuir cada categoria do cardápio a uma barraca.',
    pronto: true,
  },
  {
    para: '/disponibilidade',
    titulo: 'Disponibilidade',
    descricao: 'Esgotar ou religar itens e sabores do cardápio.',
    pronto: true,
  },
  {
    para: '/admin/horarios',
    titulo: 'Horários',
    descricao: 'Definir janelas de atendimento e pausar/reabrir pedidos.',
    pronto: true,
  },
  {
    para: '/admin/reembolsos',
    titulo: 'Reembolsos',
    descricao: 'Itens não entregues e valores a ressarcir aos clientes.',
    pronto: true,
  },
  {
    para: '/admin/faturamento',
    titulo: 'Faturamento em tempo real',
    descricao: 'Total do dia, ticket médio e faturamento por setor.',
    pronto: true,
  },
  {
    para: '/admin/qr-mesas',
    titulo: 'QR das mesas',
    descricao: 'Gerar e imprimir o cartaz com QR Code para colar nas mesas.',
    pronto: true,
  },
  {
    para: '/caixa',
    titulo: 'Caixa (imprimir fichas)',
    descricao: 'Buscar pedido pago pelo código e imprimir as fichas por barraca.',
    pronto: true,
  },
  {
    para: '/admin/catalogo',
    titulo: 'Catálogo',
    descricao: 'Gestão de categorias, itens, sabores e preços.',
    pronto: false,
  },
]

export default function Admin() {
  const { perfil, sair } = useAuth()

  return (
    <div className="min-h-screen bg-arraia-cream">
      <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold">Administração</h1>
          <p className="text-xs opacity-80">Olá, {perfil?.nome}</p>
        </div>
        <button
          onClick={sair}
          className="text-xs bg-arraia-cream/10 hover:bg-arraia-cream/20 rounded px-3 py-1"
        >
          Sair
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((c) => {
            const conteudo = (
              <div
                className={`bg-white rounded-xl shadow-sm p-5 h-full border-l-4 ${
                  c.pronto
                    ? 'border-arraia-gold hover:shadow-md transition'
                    : 'border-gray-300 opacity-60'
                }`}
              >
                <h2 className="font-bold text-arraia-brown-dark">
                  {c.titulo}
                  {!c.pronto && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-arraia-brown/50">
                      em breve
                    </span>
                  )}
                </h2>
                <p className="text-sm text-arraia-brown/70 mt-1">
                  {c.descricao}
                </p>
              </div>
            )
            return c.pronto ? (
              <Link key={c.para} to={c.para}>
                {conteudo}
              </Link>
            ) : (
              <div key={c.para}>{conteudo}</div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
