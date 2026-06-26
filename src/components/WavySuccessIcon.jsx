/** Smooth wavy seal — gentle hills/dips (no sharp star points). */
function smoothWavyPath(cx, cy, baseRadius, { lobes = 22, amplitude = 0.052, samples = 144 } = {}) {
  const points = []
  for (let i = 0; i < samples; i++) {
    const angle = (i / samples) * Math.PI * 2 - Math.PI / 2
    const mod = 1 + amplitude * Math.sin(lobes * angle)
    const r = baseRadius * mod
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }

  const n = points.length
  const at = (i) => points[(i + n) % n]

  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
  }
  return `${d} Z`
}

const VB = 64
const CX = 32
const CY = 32
const BADGE = smoothWavyPath(CX, CY, 26, { lobes: 24, amplitude: 0.048 })
const OUTER = smoothWavyPath(CX, CY, 29.5, { lobes: 24, amplitude: 0.042 })
const RING_CLASS = ['fill-emerald-500/35', 'fill-emerald-500/25', 'fill-emerald-500/18']

/** Wavy green seal with white tick — inline or hero sizes. */
export default function WavySuccessIcon({ size = 56, rings = 2, className = '' }) {
  const ringCount = Math.min(rings, RING_CLASS.length)

  return (
    <div
      className={`relative shrink-0 animate-scale-in ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {ringCount > 0 &&
        Array.from({ length: ringCount }, (_, i) => (
          <svg
            key={i}
            viewBox={`0 0 ${VB} ${VB}`}
            className="pointer-events-none absolute inset-0 animate-pulse-ring"
            style={{ animationDelay: `${i * 0.55}s` }}
          >
            <path d={OUTER} className={RING_CLASS[i]} />
          </svg>
        ))}

      <svg viewBox={`0 0 ${VB} ${VB}`} className="relative z-10 h-full w-full overflow-visible">
        <path d={OUTER} className="fill-emerald-500/30 dark:fill-emerald-500/25" />
        <path d={BADGE} className="fill-emerald-500 dark:fill-emerald-400" />
        <path
          d="M19 33 L28 42 L46 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3.75"
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
  )
}

/** @deprecated use smoothWavyPath */
export const scallopedPath = smoothWavyPath

export { smoothWavyPath }
