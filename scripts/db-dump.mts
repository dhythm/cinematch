/**
 * DATABASE_URL の DB をダンプする（Docker の PostgreSQL / Neon）。
 *
 *   pnpm db:dump                       # スキーマ + データ（backups/ に日時付きで出力）
 *   pnpm db:dump --data-only           # データのみ。マイグレーションのスカッシュ前の退避用
 *   pnpm db:dump path/to/dump.sql      # 出力先を指定
 *
 * ホストに pg_dump が無くても動くよう、接続先のバージョンに合わせた PostgreSQL イメージのコンテナで実行する。
 * public スキーマだけを対象にするので、drizzle の適用履歴（drizzle スキーマ）は含まれない。
 * DATABASE_URL 未設定時は PGlite サーバー（pnpm dev:pglite / db:pglite）に接続する。
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import nextEnv from '@next/env'
import pg from 'pg'
import { PGLITE_SERVER_URL } from '@/server/db/config'
import { defaultDumpPath, pgImage, toContainerUrl } from '@/server/db/pg-tools'

/** pg_dump / psql のバージョンを合わせるため、接続先のサーバーバージョンを聞く */
async function serverVersionNum(url: string) {
  const pool = new pg.Pool({ connectionString: url })
  try {
    const { rows } = await pool.query<{ server_version_num: string }>('show server_version_num')
    return Number(rows[0]?.server_version_num)
  } finally {
    await pool.end()
  }
}

nextEnv.loadEnvConfig(process.cwd())

const args = process.argv.slice(2)
const dataOnly = args.includes('--data-only')
const url = process.env.DATABASE_URL || PGLITE_SERVER_URL
const out = args.find((arg) => !arg.startsWith('--')) ?? defaultDumpPath(url, { dataOnly, now: new Date() })

const pgDump = [
  'run',
  '--rm',
  pgImage(await serverVersionNum(url)),
  'pg_dump',
  toContainerUrl(url),
  '--schema=public',
  '--no-owner',
  '--no-privileges',
  ...(dataOnly ? ['--data-only'] : []),
]

const result = spawnSync('docker', pgDump, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 })
if (result.error) {
  console.error('docker を実行できませんでした。Docker Desktop が起動しているか確認してください')
  console.error(result.error)
  process.exit(1)
}
if (result.status !== 0) {
  console.error(result.stderr.trim() || `pg_dump が異常終了しました (exit ${result.status})`)
  process.exit(1)
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, result.stdout)
console.log(`dumped ${new URL(url).host}${dataOnly ? ' (data only)' : ''} -> ${out}`)
