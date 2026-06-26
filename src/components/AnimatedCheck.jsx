/** Animated draw-in checkmark for success screens. */
export default function AnimatedCheck({ size = 64, tone = 'accent', className = '' }) {
  const toneCls =
    tone === 'brand' ? 'bg-brand-500 shadow-float' : 'bg-accent-500 shadow-float'
  const iconSize = Math.round(size * 0.46)

  return (
    <div
      className={`relative grid animate-scale-in place-items-center rounded-full text-white ${toneCls} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path
          d="M5.5 12.6c1.2-.8 2.4-2.6 4.1-2.1 1 .3 1.8 1.6 2.7 2.4 1.2 1 2.6 1.4 4.2-.6"
          stroke="currentColor"
          strokeWidth="2.5"
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
