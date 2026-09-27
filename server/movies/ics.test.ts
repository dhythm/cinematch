import { describe, expect, it } from 'vitest'
import { parseIcs } from './ics'

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//eiga.com//release//JA',
  'BEGIN:VEVENT',
  'UID:movie-101@eiga.com',
  'DTSTART;VALUE=DATE:20261002',
  'SUMMARY:夏雲のむこうがわ',
  'DESCRIPTION:海辺の町で過ごす最後の夏。\\n屋上で交わした約束\\, そして未来。',
  'URL:https://eiga.com/movie/101/',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:movie-102@eiga.com',
  'DTSTART:20261009T000000Z',
  'SUMMARY:とても長いタイトルの映画が折り返',
  ' されるケース',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

describe('parseIcs', () => {
  it('VEVENT を抽出し、日付を ISO(YYYY-MM-DD) に変換する', () => {
    const events = parseIcs(ICS)

    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({
      uid: 'movie-101@eiga.com',
      summary: '夏雲のむこうがわ',
      startDate: '2026-10-02',
      description: '海辺の町で過ごす最後の夏。\n屋上で交わした約束, そして未来。',
      url: 'https://eiga.com/movie/101/',
    })
  })

  it('折り返し行（先頭が空白）を連結する', () => {
    expect(parseIcs(ICS)[1]?.summary).toBe('とても長いタイトルの映画が折り返されるケース')
  })

  it('日時形式の DTSTART も日付部分だけ取り出す', () => {
    expect(parseIcs(ICS)[1]?.startDate).toBe('2026-10-09')
  })

  it('UID か DTSTART が欠けたイベントは捨てる', () => {
    const broken = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'SUMMARY:no date', 'UID:x', 'END:VEVENT', 'END:VCALENDAR']
    expect(parseIcs(broken.join('\n'))).toEqual([])
  })
})
