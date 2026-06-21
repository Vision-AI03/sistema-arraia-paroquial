import { useEffect } from 'react'

type Props = {
  mensagem: string | null
  onFechar: () => void
}

export function Toast({ mensagem, onFechar }: Props) {
  useEffect(() => {
    if (!mensagem) return
    const id = setTimeout(onFechar, 2200)
    return () => clearTimeout(id)
  }, [mensagem, onFechar])

  if (!mensagem) return null

  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-arraia-brown-dark text-arraia-cream text-sm shadow-lg max-w-[90%] text-center border border-arraia-gold/60"
    >
      {mensagem}
    </div>
  )
}
