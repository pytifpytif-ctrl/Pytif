import { Icon } from '../icons.jsx'

/** Daily schedule + trip wallet cards from the homepage brief. */
export default function ExampleCard({
  headerColor,
  headerIcon,
  headerTitle,
  rows,
  footerLeft,
  footerRight,
  footerRightColor = '#fafafa',
  defaultAmountColor = '#f97316',
  dark = false,
}) {
  const rowBorder = dark ? 'border-zinc-700' : 'border-zinc-200'
  const rowBg = dark ? 'bg-zinc-800/80' : 'bg-white'
  const footerBg = dark ? 'bg-zinc-950' : 'bg-zinc-100'
  const timeColor = dark ? 'text-zinc-100' : 'text-zinc-900'
  const labelColor = dark ? 'text-zinc-400' : 'text-zinc-500'
  const footerLeftColor = dark ? 'text-zinc-400' : 'text-zinc-500'
  const shellBorder = dark ? 'border-zinc-700' : 'border-zinc-200'

  return (
    <div className={`overflow-hidden rounded-xl border ${shellBorder}`}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ backgroundColor: headerColor }}>
        <Icon name={headerIcon} size={16} className="shrink-0 text-white" strokeWidth={1.75} />
        <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-white">{headerTitle}</p>
      </div>

      {rows.map((row, i) => (
        <div
          key={`${row.timeTop}-${i}`}
          className={`flex items-center justify-between gap-2 px-3.5 py-2 ${rowBg} ${
            i < rows.length - 1 ? `border-b ${rowBorder}` : ''
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <Icon name={row.icon} size={13} className="shrink-0 text-zinc-500" strokeWidth={1.75} />
            <div className="min-w-0 leading-snug">
              <p className={`truncate text-[13px] font-medium ${timeColor}`}>{row.timeTop}</p>
              <p className={`truncate text-[12px] ${labelColor}`}>{row.labelBottom}</p>
            </div>
          </div>
          <p
            className="shrink-0 text-[13px] font-semibold tabular-nums"
            style={{ color: row.amountColor ?? defaultAmountColor }}
          >
            {row.amount}
          </p>
        </div>
      ))}

      <div className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${footerBg}`}>
        <p className={`text-[12px] ${footerLeftColor}`}>{footerLeft}</p>
        <p className="text-[13px] font-semibold tabular-nums" style={{ color: footerRightColor }}>
          {footerRight}
        </p>
      </div>
    </div>
  )
}
