import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function SemAcesso() {
  const { sair } = useAuth()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-arraia-cream px-4 text-center gap-4">
      <h1 className="text-2xl font-bold text-arraia-brown-dark">
        Sem acesso a esta área
      </h1>
      <p className="text-arraia-brown/70 max-w-sm">
        Seu usuário não tem permissão para ver esta página. Se acha que é um
        engano, fale com o administrador.
      </p>
      <div className="flex gap-3">
        <Link
          to="/"
          className="bg-arraia-brown-dark text-arraia-cream px-4 py-2 rounded-md font-bold"
        >
          Ir ao cardápio
        </Link>
        <button
          onClick={sair}
          className="border border-arraia-brown-dark text-arraia-brown-dark px-4 py-2 rounded-md font-bold"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
