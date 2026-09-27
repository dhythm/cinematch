/**
 * pnpm db:dump で取ったダンプを DATABASE_URL の DB に流し込む。
 *
 *   pnpm db:restore backups/localhost-20260927-102030.sql
 *   pnpm db:restore backups/... --yes          # リモート（Neon など）へ戻すときに必要
 *
 * 想定する使い方:
 *   1. pnpm db:dump --data-only        # データを退避
 *   2. マイグレーションをスカッシュして pnpm db:migrate で作り直す
 *   3. pnpm db:restore <退避したファイル>
 *
 * ホストに psql が無くても動くよう、compose.yaml と同じイメージのコンテナで実行する。
 * 途中でエラーが出たらそこで止まる（ON_ERROR_STOP=1）。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import nextEnv from '@next/env'
import { PGLITE_SERVER_URL } from '@/server/db/config'
import { isRemote, PG_IMAGE, toContainerUrl } from '@/server/db/pg-tools'

nextEnv.loadEnvConfig(process.cwd())

const args = process.argv.slice(2)
const yes = args.includes('--yes')
const file = args.find((arg) => !arg.startsWith('--'))
if (!file) {
  console.error('usage: pnpm db:restore <ダンプファイル> [--yes]')
  process.exit(1)
}
if (!existsSync(file)) {
  console.error(`ファイルが見つかりません: ${file}`)
  process.exit(1)
}

const url = process.env.DATABASE_URL || PGLITE_SERVER_URL
const host = new URL(url).host
// リモートを書き換えるのは事故のダメージが大きいので、明示の --yes を必須にする
if (isRemote(url) && !yes) {
  console.error(`リモートの DB (${host}) に書き込もうとしています。意図した操作なら --yes を付けて実行してください`)
  process.exit(1)
}

const result = spawnSync(
  'docker',
  ['run', '--rm', '-i', PG_IMAGE, 'psql', toContainerUrl(url), '-v', 'ON_ERROR_STOP=1', '-f', '-'],
  { input: readFileSync(file, 'utf8'), encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
)
if (result.error) {
  console.error('docker を実行できませんでした。Docker Desktop が起動しているか確認してください')
  console.error(result.error)
  process.exit(1)
}
if (result.status !== 0) {
  console.error(result.stderr.trim() || `psql が異常終了しました (exit ${result.status})`)
  process.exit(1)
}

console.log(`restored ${file} -> ${host}`)
