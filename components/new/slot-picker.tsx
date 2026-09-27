import { Check } from 'lucide-react'
import { SLOT_LABELS, SLOT_ORDER } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { TimeSlot } from '@/lib/types'

export function SlotPicker({ selected, onToggle }: { selected: Set<TimeSlot>; onToggle: (slot: TimeSlot) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SLOT_ORDER.map((slot) => {
        const active = selected.has(slot)
        return (
          <button
            key={slot}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(slot)}
            className={cn(
              'flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
              active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50',
            )}
          >
            <span className="flex flex-col">
              <span className="font-bold">{SLOT_LABELS[slot].label}</span>
              <span className={cn('font-mono text-xs', active ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                {SLOT_LABELS[slot].time}
              </span>
            </span>
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full border',
                active ? 'border-accent bg-accent text-accent-foreground' : 'border-border',
              )}
              aria-hidden
            >
              {active && <Check className="size-3" />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
