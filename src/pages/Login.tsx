import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { perfil, carregando, entrar } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-arraia-cream">
        <p className="text-arraia-brown/70">Carregando…</p>
      </div>
    )
  }

  if (perfil) {
    const destino =
      (location.state as { de?: string } | null)?.de ??
      (perfil.papel === 'admin' ? '/admin' : '/cozinha')
    return <Navigate to={destino} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const { erro: msg } = await entrar(email, senha)
    setEnviando(false)
    if (msg) setErro(msg)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-arraia-cream px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow p-6 space-y-4"
      >
        <h1 className="text-xl font-bold text-arraia-brown-dark text-center">
          Acesso da equipe
        </h1>

        <label className="block">
          <span className="text-sm text-arraia-brown-dark">E-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-arraia-gold"
          />
        </label>

        <label className="block">
          <span className="text-sm text-arraia-brown-dark">Senha</span>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-arraia-gold"
          />
        </label>

        {erro && (
          <p className="text-sm text-arraia-red bg-red-100 border border-arraia-red/40 rounded-md p-2">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-arraia-brown-dark text-arraia-cream font-bold py-2 rounded-md disabled:opacity-60"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
