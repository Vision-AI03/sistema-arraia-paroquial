import { useAuth } from '../hooks/useAuth'

export default function Cozinha() {
  const { perfil, sair } = useAuth()

  return (
    <div className="min-h-screen bg-arraia-cream">
      <header className="bg-arraia-brown-dark text-arraia-cream px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold">Cozinha</h1>
          <p className="text-xs opacity-80">Olá, {perfil?.nome}</p>
        </div>
        <button
          onClick={sair}
          className="text-xs bg-arraia-cream/10 hover:bg-arraia-cream/20 rounded px-3 py-1"
        >
          Sair
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        <p className="text-arraia-brown/70 text-center py-10">
          KDS em construção — próxima etapa: kanban de pedidos em tempo real e
          controle de esgotar sabor.
        </p>
      </main>
    </div>
  )
}
