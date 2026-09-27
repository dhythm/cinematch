import { addDays, dayOfWeek, diffDays, formatJaDate, HOLIDAYS, parseDate } from '@/lib/date'
import { cn } from '@/lib/utils'

const HEAD = ['日', '月', '火', '水', '木', '金', '土']

type Props = {
  releaseDate: string
  rangeDays: number
  selected: Set<string>
  onToggle: (iso: string) => void
}

export function CandidateCalendar({ releaseDate, rangeDays, selected, onToggle }: Props) {
  const start = addDays(releaseDate, -dayOfWeek(releaseDate))
  const lastDay = addDays(releaseDate, rangeDays - 1)
  const totalCells = Math.ceil((diffDays(start, lastDay) + 1) / 7) * 7
  const cells = Array.from({ length: totalCells }, (_, i) => addDays(start, i))

  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="候補日カレンダー">
        {HEAD.map((h, i) => (
          <div
            key={h}
            className={cn(
              'pb-1 text-center text-xs font-bold text-muted-foreground',
              i === 0 && 'text-destructive',
              i === 6 && 'text-primary',
            )}
            aria-hidden
          >
            {h}
          </div>
        ))}
        {cells.map((iso) => {
          const offset = diffDays(releaseDate, iso)
          const inRange = offset >= 0 && offset < rangeDays
          const isSelected = inRange && selected.has(iso)
          const dow = dayOfWeek(iso)
          const holiday = HOLIDAYS[iso]
          const date = parseDate(iso)
          const showMonth = date.getDate() === 1 || iso === start

          return (
            <button
              key={iso}
              type="button"
              disabled={!inRange}
              aria-pressed={isSelected}
              aria-label={`${formatJaDate(iso)}${holiday ? ` ${holiday}` : ''}${offset === 0 ? ' 公開日' : ''}`}
              onClick={() => onToggle(iso)}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-sm transition-colors sm:aspect-[5/4]',
                !inRange && 'cursor-not-allowed border-transparent text-muted-foreground/40',
                inRange && !isSelected && 'border-border bg-background hover:border-primary/60',
                isSelected && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {showMonth && (
                <span className="absolute top-1 left-1.5 font-mono text-[9px] opacity-60">{`${date.getMonth() + 1}月`}</span>
              )}
              <span
                className={cn(
                  'font-mono text-base font-medium',
                  inRange && !isSelected && (dow === 0 || holiday) && 'text-destructive',
                  inRange && !isSelected && dow === 6 && !holiday && 'text-primary',
                )}
              >
                {date.getDate()}
              </span>
              {offset === 0 && (
                <span className="rounded-sm bg-accent px-1 text-[9px] leading-tight font-bold text-accent-foreground">
                  公開
                </span>
              )}
              {holiday && offset !== 0 && inRange && (
                <span className="max-w-full truncate px-0.5 text-[9px] leading-tight opacity-80">祝</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
