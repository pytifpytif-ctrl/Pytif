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
  iconSize = 22,
  centered = false,
  children,
  className = '',
}) {
  const tone = ACCENTS[accent] ?? ACCENTS.orange

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden ${
        centered ? 'items-center justify-center text-center' : 'justify-center'
      } ${className}`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${tone.glow} blur-2xl`} />
        <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/[0.04]" />
        <div className={`absolute left-0 top-8 h-px w-14 bg-gradient-to-r ${tone.line} to-transparent`} />
        <div className="absolute bottom-10 right-2 h-16 w-16 rotate-12 rounded-2xl border border-white/[0.04] bg-white/[0.02]" />
      </div>

      <div className={`relative z-10 w-full ${centered ? 'px-1' : ''}`}>
        {icon && (
          <div
            className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${tone.iconBg} ${tone.iconRing} ${
              centered ? 'mx-auto' : ''
            }`}
          >
            <Icon name={icon} size={iconSize} className={tone.iconText} strokeWidth={1.75} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function SlideEyebrow({ children }) {
  return (
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{children}</p>
  )
}

export function StepPills({ steps }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {steps.map((step) => (
        <div
          key={step.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/80 bg-zinc-800/80 px-2.5 py-1"
        >
          <Icon name={step.icon} size={12} className="text-orange-400" strokeWidth={1.75} />
          <span className="text-[11px] font-medium text-zinc-300">{step.label}</span>
        </div>
      ))}
    </div>
  )
}
