import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { StatusAtendimento } from '../types'

export function useAtendimento() {
  const [status, setStatus] = useState<StatusAtendimento | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      const { data } = await supabase
        .from('status_atendimento')
        .select('aberto, proxima_data, proxima_abre, fecha_hoje')
        .maybeSingle()
      if (cancelado) return
      setStatus((data as StatusAtendimento | null) ?? {
        aberto: false,
        proxima_data: null,
        proxima_abre: null,
        fecha_hoje: null,
      })
      setCarregando(false)
    }

    carregar()

    // Reavalia a cada minuto (para captar a transição fecha/abre por hora)
    const tick = setInterval(carregar, 60000)

    // Realtime: se admin pausar/reabrir, reavalia agora
    const canal = supabase
      .channel('status-atendimento')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'configuracao_atendimento' },
        () => carregar()
      )
      .subscribe()

    return () => {
      cancelado = true
      clearInterval(tick)
      supabase.removeChannel(canal)
    }
  }, [])

  return { status, carregando }
}

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

export function formatarProximaAbertura(
  status: StatusAtendimento | null
): string {
  if (!status?.proxima_data || !status?.proxima_abre) {
    return 'em breve'
  }
  const [ano, mes, dia] = status.proxima_data.split('-').map(Number)
  const hora = status.proxima_abre.slice(0, 5)
  const hoje = new Date()
  const ehHoje =
    hoje.getFullYear() === ano &&
    hoje.getMonth() + 1 === mes &&
    hoje.getDate() === dia
  if (ehHoje) return `hoje às ${hora}`
  return `${dia} de ${MESES[mes - 1]} às ${hora}`
}

export function formatarFechamentoHoje(
  status: StatusAtendimento | null
): string | null {
  if (!status?.fecha_hoje) return null
  return status.fecha_hoje.slice(0, 5)
}
