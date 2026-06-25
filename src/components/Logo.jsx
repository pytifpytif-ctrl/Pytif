import { useId } from 'react'

/** Jiokoe mark — orange rounded square, lock + upward arrow (commit → scheduled payout). */
export function LogoMark({ size = 36, className = '' }) {
  const id = useId().replace(/:/g, '')

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fb923c" />
          <stop offset="0.48" stopColor="#f97316" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <radialGradient
          id={`${id}-shine`}
          cx="0"
          cy="0"
          r="1"
          gradientTransform="matrix(26 26 26 -26 4 4)"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id}-bg)`} />
      <rect width="48" height="48" rx="13" fill={`url(#${id}-shine)`} />
      <path
        d="M18 21V17a6 6 0 0 1 12 0v4"
        stroke="#fff"
        strokeWidth="2.75"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="16" y="21" width="16" height="13" rx="3.5" fill="#fff" />
      <path
        d="M24 26.5v4.5M24 26.5l-2.75 2.75M24 26.5l2.75 2.75"
        stroke="#ea580c"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ size = 36, wordmark, className = '' }) {
  const showWordmark = wordmark ?? size >= 56
  const markSize = showWordmark ? Math.round(size * 0.72) : size

  return (
    <span
      className={`inline-flex items-center select-none ${showWordmark ? 'gap-3' : ''} ${className}`}
      style={{ height: size }}
      role="img"
      aria-label="Jiokoe"
    >
      <LogoMark size={markSize} className="shrink-0" />
      {showWordmark && (
        <span className="font-extrabold tracking-tight text-ink" style={{ fontSize: size * 0.38, lineHeight: 1 }}>
          Jiokoe
        </span>
      )}
    </span>
  )
}
