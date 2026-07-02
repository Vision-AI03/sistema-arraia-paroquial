import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { Papel } from '../types'

type Props = {
  papeisPermitidos: Papel[]
  children: ReactNode
}

export function RotaProtegida({ papeisPermitidos, children }: Props) {
  const { perfil, carregando } = useAuth()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-arraia-cream">
        <p className="text-arraia-brown/70">Carregando…</p>
      </div>
    )
  }

  if (!perfil) {
    return <Navigate to="/login" replace state={{ de: location.pathname }} />
  }

  if (!papeisPermitidos.includes(perfil.papel)) {
    return <Navigate to="/sem-acesso" replace />
  }

  return <>{children}</>
}
