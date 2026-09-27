import { describe, expect, it } from 'vitest'
import type { Participant } from '@/lib/types'
import { buildCandidates, findBestCandidate, isWithinScheduleWindow, tallyCandidate } from './schedule'

describe('buildCandidates', () => {
  it('日付×時間帯の組み合わせを日付順・時間帯順で生成する', () => {
    const candidates = buildCandidates(['2026-10-10', '2026-10-09'], ['evening', 'noon'])

    expect(candidates.map((c) => [c.date, c.slot])).toEqual([
      ['2026-10-09', 'noon'],
      ['2026-10-09', 'evening'],
      ['2026-10-10', 'noon'],
      ['2026-10-10', 'evening'],
    ])
  })

  it('重複した日付や時間帯は1つにまとめる', () => {
    const candidates = buildCandidates(['2026-10-09', '2026-10-09'], ['noon', 'noon'])

    expect(candidates).toHaveLength(1)
  })

  it('候補IDはイベント内で一意になる', () => {
    const candidates = buildCandidates(['2026-10-09', '2026-10-10'], ['noon', 'late'])

    expect(new Set(candidates.map((c) => c.id)).size).toBe(candidates.length)
  })
})

describe('isWithinScheduleWindow', () => {
  it('公開日から14日以内なら true', () => {
    expect(isWithinScheduleWindow('2026-10-09', '2026-10-09')).toBe(true)
    expect(isWithinScheduleWindow('2026-10-09', '2026-10-22')).toBe(true)
  })

  it('公開日より前、または15日目以降なら false', () => {
    expect(isWithinScheduleWindow('2026-10-09', '2026-10-08')).toBe(false)
    expect(isWithinScheduleWindow('2026-10-09', '2026-10-23')).toBe(false)
  })
})

const participants: Participant[] = [
  { id: 'p1', name: 'A', answers: { c1: 'yes', c2: 'maybe' } },
  { id: 'p2', name: 'B', answers: { c1: 'no', c2: 'yes' } },
  { id: 'p3', name: 'C', answers: { c1: 'yes' } },
]

describe('tallyCandidate', () => {
  it('○=2点 △=1点で集計する（未回答は数えない）', () => {
    expect(tallyCandidate('c1', participants)).toEqual({ yes: 2, maybe: 0, no: 1, score: 4 })
    expect(tallyCandidate('c2', participants)).toEqual({ yes: 1, maybe: 1, no: 0, score: 3 })
  })
})

describe('findBestCandidate', () => {
  const candidates = [
    { id: 'c1', date: '2026-10-09', slot: 'noon' as const },
    { id: 'c2', date: '2026-10-10', slot: 'noon' as const },
  ]

  it('回答者がいなければ undefined', () => {
    expect(findBestCandidate(candidates, [])).toBeUndefined()
  })

  it('スコアが最も高い候補を返す', () => {
    expect(findBestCandidate(candidates, participants)?.candidateId).toBe('c1')
  })

  it('同点なら○が多い候補を優先する', () => {
    const tie: Participant[] = [
      { id: 'p1', name: 'A', answers: { c1: 'maybe', c2: 'yes' } },
      { id: 'p2', name: 'B', answers: { c1: 'maybe', c2: 'no' } },
    ]
    expect(findBestCandidate(candidates, tie)?.candidateId).toBe('c2')
  })
})
