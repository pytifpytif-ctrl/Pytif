/** Success check — tick inside a solid circle with pulsing ripple rings on the outer edge. */
export default function AnimatedCheck({ size = 64, tone = 'accent', className = '', rings = 3 }) {
  const toneBg = tone === 'brand' ? 'bg-brand-500' : 'bg-accent-500'
  const ringColor =
    tone === 'brand'
      ? ['bg-brand-500/35', 'bg-brand-500/25', 'bg-brand-500/18']
      : ['bg-accent-500/35', 'bg-accent-500/25', 'bg-accent-500/18']
  const iconSize = Math.round(size * 0.44)
  const ringCount = Math.min(rings, ringColor.length)

  return (
    <div
      className={`relative animate-scale-in ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {Array.from({ length: ringCount }, (_, i) => (
        <span
          key={i}
          className={`pointer-events-none absolute inset-0 rounded-full ${ringColor[i]} animate-pulse-ring`}
          style={{ animationDelay: `${i * 0.55}s` }}
        />
      ))}

      <div
        className={`relative z-10 grid place-items-center rounded-full text-white shadow-float ${toneBg}`}
        style={{ width: size, height: size }}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          className="overflow-visible"
        >
          <path
            d="M6.5 12.5 10.5 16.5 18 8.5"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset="1"
            className="animate-draw-in"
            style={{ '--dash': 1 }}
          />
        </svg>
      </div>
    </div>
  )
}
