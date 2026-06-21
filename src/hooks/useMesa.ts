import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Mesa } from '../types'

export function useMesa() {
  const [mesa, setMesa] = useState<Mesa | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('mesa')

    if (!token) {
      setCarregando(false)
      return
    }

    supabase
      .from('mesas')
      .select('id, numero, token, ativo')
      .eq('token', token)
      .eq('ativo', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[mesa] erro:', error.message)
        if (data) setMesa(data as Mesa)
        setCarregando(false)
      })
  }, [])

  return { mesa, carregando }
}
