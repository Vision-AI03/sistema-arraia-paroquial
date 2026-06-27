const CORES = ['#C0392B', '#E8B923', '#4E9A51', '#2E86C1', '#E67E22']

type Props = {
  quantidade?: number
  altura?: 'normal' | 'mini'
}

export function Bandeirinhas({ quantidade = 22, altura = 'normal' }: Props) {
  const mini = altura === 'mini'
  const triH = mini ? 10 : 13
  const triW = mini ? 5 : 7
  const containerH = mini ? 14 : 26

  return (
    <div
      aria-hidden="true"
      className="relative w-full overflow-hidden pointer-events-none select-none"
      style={{ height: containerH }}
    >
      <div className="absolute top-1 left-0 right-0 h-px bg-arraia-cream/50" />
      <div className="flex justify-around items-start pt-1 px-1">
        {Array.from({ length: quantidade }).map((_, i) => (
          <span
            key={i}
            className="animate-sway"
            style={{
              width: 0,
              height: 0,
              borderLeft: `${triW}px solid transparent`,
              borderRight: `${triW}px solid transparent`,
              borderTop: `${triH}px solid ${CORES[i % CORES.length]}`,
              transformOrigin: 'top center',
              animationDelay: `${(i % 5) * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
