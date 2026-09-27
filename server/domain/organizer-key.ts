import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * 幹事キー: イベント作成者だけが持つ秘密の値。
 * DB にはハッシュだけを保存し、キーそのものは幹事のクッキーと幹事用 URL にだけ存在する。
 */
export function generateOrganizerKey() {
  return randomBytes(32).toString('base64url')
}

export function hashOrganizerKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}

export function verifyOrganizerKey(key: string | undefined, hash: string | undefined) {
  if (!key || !hash) return false
  const actual = Buffer.from(hashOrganizerKey(key), 'hex')
  const expected = Buffer.from(hash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
