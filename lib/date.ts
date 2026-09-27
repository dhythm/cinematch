import type { Answer, Candidate, Participant, TimeSlot } from './types'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

export function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIso(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(iso: string, days: number) {
  const date = parseDate(iso)
  date.setDate(date.getDate() + days)
  return toIso(date)
}

export function diffDays(fromIso: string, toIsoStr: string) {
  const ms = parseDate(toIsoStr).getTime() - parseDate(fromIso).getTime()
  return Math.round(ms / 86_400_000)
}

export function weekday(iso: string) {
  return WEEKDAYS[parseDate(iso).getDay()]
}

export function dayOfWeek(iso: string) {
  return parseDate(iso).getDay()
}

export function formatMonthDay(iso: string) {
  const date = parseDate(iso)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function formatJaDate(iso: string) {
  const date = parseDate(iso)
  return `${date.getMonth() + 1}月${date.getDate()}日(${weekday(iso)})`
}

export const HOLIDAYS: Record<string, string> = {
  '2026-10-12': 'スポーツの日',
  '2026-11-03': '文化の日',
  '2026-11-23': '勤労感謝の日',
}

export function isOffDay(iso: string) {
  const d = dayOfWeek(iso)
  return d === 0 || d === 6 || iso in HOLIDAYS
}

export const SLOT_LABELS: Record<TimeSlot, { label: string; time: string }> = {
  morning: { label: '午前', time: '9:00〜' },
  noon: { label: '昼', time: '12:00〜' },
  evening: { label: '夕方', time: '17:00〜' },
  late: { label: 'レイト', time: '20:00〜' },
}

export const SLOT_ORDER: TimeSlot[] = ['morning', 'noon', 'evening', 'late']

export const ANSWER_SYMBOL: Record<Answer, string> = {
  yes: '○',
  maybe: '△',
  no: '×',
}

export function tallyCandidate(candidateId: string, participants: Participant[]) {
  let yes = 0
  let maybe = 0
  let no = 0
  for (const p of participants) {
    const a = p.answers[candidateId]
    if (a === 'yes') yes++
    else if (a === 'maybe') maybe++
    else if (a === 'no') no++
  }
  return { yes, maybe, no, score: yes * 2 + maybe }
}

export function findBestCandidate(candidates: Candidate[], participants: Participant[]) {
  if (participants.length === 0) return undefined
  let best: { candidate: Candidate; yes: number; maybe: number; no: number; score: number } | undefined
  for (const c of candidates) {
    const t = tallyCandidate(c.id, participants)
    if (!best || t.score > best.score || (t.score === best.score && t.yes > best.yes)) {
      best = { candidate: c, ...t }
    }
  }
  return best
}
