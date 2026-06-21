const CORES = ['#C0392B', '#E8B923', '#4E9A51', '#2E86C1', '#E67E22']

type Props = {
  quantidade?: number
}

export function Bandeirinhas({ quantidade = 24 }: Props) {
  return (
    <div
      aria-hidden="true"
      className="relative w-full h-8 overflow-hidden pointer-events-none select-none"
    >
      <div className="absolute top-2 left-0 right-0 h-px bg-arraia-brown-dark/40" />
      <div className="flex justify-around items-start pt-2 px-1">
        {Array.from({ length: quantidade }).map((_, i) => (
          <span
            key={i}
            className="animate-sway"
            style={{
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: `14px solid ${CORES[i % CORES.length]}`,
              transformOrigin: 'top center',
              animationDelay: `${(i % 5) * 0.3}s`,
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))',
            }}
          />
        ))}
      </div>
    </div>
  )
}
