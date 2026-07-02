import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext, type EstadoAuth } from '../hooks/useAuth'
import type { Perfil } from '../types'

async function carregarPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfis')
    .select('id, nome, papel')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('[auth] erro ao buscar perfil:', error.message)
    return null
  }
  return (data as Perfil) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false

    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      const p = user ? await carregarPerfil(user.id) : null
      if (!cancelado) {
        setPerfil(p)
        setCarregando(false)
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      const user = session?.user
      const p = user ? await carregarPerfil(user.id) : null
      if (!cancelado) setPerfil(p)
    })

    return () => {
      cancelado = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const valor: EstadoAuth = {
    perfil,
    carregando,
    entrar: async (email, senha) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      return { erro: error?.message ?? null }
    },
    sair: async () => {
      await supabase.auth.signOut()
      setPerfil(null)
    },
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
