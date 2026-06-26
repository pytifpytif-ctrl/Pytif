import { Icon } from '../icons.jsx'

export default function PromiseItem({ icon, title, subtitle, dark = false }) {
  if (dark) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-800/60 p-4 ring-1 ring-white/[0.04]">
        <div aria-hidden className="pointer-events-none absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-orange-500/10 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 ring-1 ring-orange-500/30">
            <Icon name={icon} size={20} className="text-orange-400" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="mt-1 text-[13px] leading-normal text-zinc-400">{subtitle}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
        <Icon name={icon} size={15} className="text-orange-500" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-medium text-zinc-900">{title}</p>
        <p className="mt-0.5 text-[13px] leading-normal text-zinc-500">{subtitle}</p>
      </div>
    </div>
  )
}
