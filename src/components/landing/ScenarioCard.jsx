import { Icon } from '../icons.jsx'

export default function ScenarioCard({ icon, text, dark = false }) {
  if (dark) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800/90 p-3 ring-1 ring-white/[0.04]">
        <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl" />
        <div className="relative flex items-start gap-2.5 pl-0.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 p-1.5 ring-1 ring-orange-500/25">
            <Icon name={icon} size={16} className="text-orange-400" strokeWidth={1.75} />
          </div>
          <p className="pt-0.5 text-[13px] leading-snug text-zinc-200">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-zinc-200 bg-white p-3">
      <Icon name={icon} size={16} className="mt-0.5 shrink-0 text-zinc-500" strokeWidth={1.75} />
      <p className="text-sm leading-normal text-zinc-600">{text}</p>
    </div>
  )
}
