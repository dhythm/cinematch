import { describe, expect, it } from 'vitest'
import { generateOrganizerKey, hashOrganizerKey, verifyOrganizerKey } from './organizer-key'

describe('organizer key', () => {
  it('推測できない長さのキーを毎回別に生成する', () => {
    const a = generateOrganizerKey()
    const b = generateOrganizerKey()

    expect(a).not.toBe(b)
    expect(a).toMatch(/^[\w-]{43}$/)
  })

  it('保存用ハッシュはキーそのものを含まない', () => {
    const key = generateOrganizerKey()

    expect(hashOrganizerKey(key)).not.toContain(key)
    expect(hashOrganizerKey(key)).toBe(hashOrganizerKey(key))
  })

  it('正しいキーだけを受け付ける', () => {
    const key = generateOrganizerKey()
    const hash = hashOrganizerKey(key)

    expect(verifyOrganizerKey(key, hash)).toBe(true)
    expect(verifyOrganizerKey(generateOrganizerKey(), hash)).toBe(false)
    expect(verifyOrganizerKey(undefined, hash)).toBe(false)
    expect(verifyOrganizerKey(key, undefined)).toBe(false)
  })
})
