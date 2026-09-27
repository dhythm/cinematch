import { describe, expect, it } from 'vitest'
import { addDays, diffDays, todayInJapan } from './date'

describe('todayInJapan', () => {
  it('UTC 15:00 以降は日本時間の翌日になる', () => {
    expect(todayInJapan(new Date('2026-09-27T14:59:59Z'))).toBe('2026-09-27')
    expect(todayInJapan(new Date('2026-09-27T15:00:00Z'))).toBe('2026-09-28')
  })
})

describe('addDays / diffDays', () => {
  it('月をまたいで計算できる', () => {
    expect(addDays('2026-09-30', 2)).toBe('2026-10-02')
    expect(diffDays('2026-09-30', '2026-10-02')).toBe(2)
  })
})
