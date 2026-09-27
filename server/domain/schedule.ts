import { diffDays, SLOT_ORDER } from '@/lib/date'
import type { Candidate, CandidateTally, Participant, TimeSlot } from '@/lib/types'

/** 公開日から何日間を調整対象にできるか（公開日を含む） */
export const SCHEDULE_WINDOW_DAYS = 14

export function isWithinScheduleWindow(releaseDate: string, date: string) {
  const diff = diffDays(releaseDate, date)
  return diff >= 0 && diff < SCHEDULE_WINDOW_DAYS
}

export function buildCandidates(dates: string[], slots: TimeSlot[]): Candidate[] {
  const uniqueDates = [...new Set(dates)].sort()
  const orderedSlots = SLOT_ORDER.filter((slot) => slots.includes(slot))
  return uniqueDates.flatMap((date) => orderedSlots.map((slot) => ({ id: `${date}_${slot}`, date, slot })))
}

export function tallyCandidate(candidateId: string, participants: Participant[]): CandidateTally {
  let yes = 0
  let maybe = 0
  let no = 0
  for (const participant of participants) {
    const answer = participant.answers[candidateId]
    if (answer === 'yes') yes++
    else if (answer === 'maybe') maybe++
    else if (answer === 'no') no++
  }
  return { yes, maybe, no, score: yes * 2 + maybe }
}

export function findBestCandidate(candidates: Candidate[], participants: Participant[]) {
  if (participants.length === 0) return undefined
  let best: ({ candidateId: string } & CandidateTally) | undefined
  for (const candidate of candidates) {
    const tally = tallyCandidate(candidate.id, participants)
    if (!best || tally.score > best.score || (tally.score === best.score && tally.yes > best.yes)) {
      best = { candidateId: candidate.id, ...tally }
    }
  }
  return best
}
