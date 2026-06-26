import { Icon } from '../icons.jsx'

const ACCENTS = {
  orange: {
    glow: 'bg-orange-500/20',
    iconBg: 'bg-orange-500/15',
    iconRing: 'ring-orange-500/30',
    iconText: 'text-orange-400',
    line: 'from-orange-500/35',
  },
  amber: {
    glow: 'bg-amber-500/20',
    iconBg: 'bg-amber-500/15',
    iconRing: 'ring-amber-500/30',
    iconText: 'text-amber-400',
    line: 'from-amber-500/35',
  },
  green: {
    glow: 'bg-emerald-500/20',
    iconBg: 'bg-emerald-500/15',
    iconRing: 'ring-emerald-500/30',
    iconText: 'text-emerald-400',
    line: 'from-emerald-500/35',
  },
  zinc: {
    glow: 'bg-white/5',
    iconBg: 'bg-zinc-800',
    iconRing: 'ring-white/10',
    iconText: 'text-zinc-400',
    line: 'from-white/15',
  },
}

export function SlideFrame({
  accent = 'orange',
  icon,
  iconSize,
  centered = false,
  compact = false,
  children,
  className = '',
}) {
  const tone = ACCENTS[accent] ?? ACCENTS.orange
  const resolvedIconSize = iconSize ?? (compact ? 18 : 22)
  const iconBox = compact ? 'mb-2 h-10 w-10 p-2' : 'mb-3 h-12 w-12 p-2.5'

  return (
    <div
      className={`relative flex h-full flex-col overflow-x-visible overflow-y-hidden ${
        centered ? 'items-center justify-center text-center' : 'justify-center'
      } ${className}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${tone.glow} blur-2xl`} />
        <div className="absolute -bottom-8 left-2 h-20 w-20 rounded-full bg-white/[0.04]" />
        <div className={`absolute right-3 top-10 h-px w-12 bg-gradient-to-l ${tone.line} to-transparent`} />
        <div className="absolute bottom-10 right-2 h-16 w-16 rotate-12 rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
      </div>

      <div className={`relative z-10 w-full ${centered ? 'px-2' : icon ? 'pl-3 pr-1' : ''}`}>
        {icon && (
          <div
            className={`inline-flex items-center justify-center rounded-2xl ring-1 ${iconBox} ${tone.iconBg} ${tone.iconRing} ${
              centered ? 'mx-auto' : 'ml-0.5'
            }`}
          >
            <Icon name={icon} size={resolvedIconSize} className={tone.iconText} strokeWidth={1.75} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function SlideEyebrow({ children }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{children}</p>
  )
}

export function SlideBodyText({ children, className = '' }) {
  return <p className={`text-[13px] leading-[1.6] text-zinc-300 ${className}`.trim()}>{children}</p>
}

export function StepPills({ steps, compact = false }) {
  return (
    <div className={`flex flex-wrap ${compact ? 'mt-3 gap-2' : 'mt-4 gap-2'}`}>
      {steps.map((step) => (
        <div
          key={step.label}
          className={`inline-flex items-center overflow-visible rounded-full border border-zinc-700/80 bg-zinc-800/80 ${
            compact ? 'gap-1.5 py-1.5 pl-3 pr-2.5' : 'gap-2 py-1.5 pl-3.5 pr-3'
          }`}
        >
          <span className="inline-flex shrink-0 items-center justify-center overflow-visible pl-0.5">
            <Icon
              name={step.icon}
              size={compact ? 12 : 13}
              className="text-orange-400"
              strokeWidth={1.75}
            />
          </span>
          <span className="text-[12px] font-medium text-zinc-300">{step.label}</span>
        </div>
      ))}
    </div>
  )
}
