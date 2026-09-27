import { describe, expect, it } from 'vitest'
import { defaultDumpPath, isRemote, toContainerUrl } from './pg-tools'

const NEON = 'postgresql://user:pw@ep-x.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
const LOCAL = 'postgresql://cinematchan:cinematchan@localhost:5432/cinematchan'

describe('toContainerUrl', () => {
  it('localhost はコンテナから見たホストに書き換える', () => {
    expect(toContainerUrl(LOCAL)).toBe('postgresql://cinematchan:cinematchan@host.docker.internal:5432/cinematchan')
  })

  it('127.0.0.1 も書き換える（ポートとパラメータは保つ）', () => {
    expect(toContainerUrl('postgresql://postgres:postgres@127.0.0.1:5433/postgres?x=1')).toBe(
      'postgresql://postgres:postgres@host.docker.internal:5433/postgres?x=1',
    )
  })

  it('リモートの接続先はそのまま使う', () => {
    expect(toContainerUrl(NEON)).toBe(NEON)
  })
})

describe('isRemote', () => {
  it('localhost / 127.0.0.1 はローカル扱い', () => {
    expect(isRemote(LOCAL)).toBe(false)
    expect(isRemote('postgresql://postgres:postgres@127.0.0.1:5433/postgres')).toBe(false)
  })

  it('それ以外はリモート扱い（確認なしの書き込みを防ぐ）', () => {
    expect(isRemote(NEON)).toBe(true)
  })
})

describe('defaultDumpPath', () => {
  // ファイル名はローカル時刻で作るので、テストもローカル時刻で日時を組み立てる（CI は UTC）
  const now = new Date(2026, 8, 27, 10, 20, 30)

  it('接続先ホストと日時から出力先を決める', () => {
    expect(defaultDumpPath(LOCAL, { dataOnly: false, now })).toBe('backups/localhost-20260927-102030.sql')
  })

  it('データのみのダンプは -data を付けて区別する', () => {
    expect(defaultDumpPath(LOCAL, { dataOnly: true, now })).toBe('backups/localhost-20260927-102030-data.sql')
  })

  it('ホスト名のうちファイル名に使えない文字は置き換える', () => {
    expect(defaultDumpPath(NEON, { dataOnly: false, now })).toBe(
      'backups/ep-x_ap-southeast-1_aws_neon_tech-20260927-102030.sql',
    )
  })
})
