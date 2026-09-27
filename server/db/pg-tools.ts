/**
 * pg_dump / psql を Docker 経由で動かすための小道具。
 * ホストに PostgreSQL クライアントが無くても、compose.yaml と同じイメージで実行できるようにする。
 */

/** compose.yaml と揃える。pg_dump はサーバーと同じかそれ以上のバージョンが必要 */
export const PG_IMAGE = 'postgres:17-alpine'

/** コンテナから見たホスト。Docker Desktop が解決する */
const HOST_FROM_CONTAINER = 'host.docker.internal'

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1']

/** ホスト側で動いている DB か（リモートへの書き込みを確認なしで行わないための判定） */
export function isRemote(url: string) {
  return !LOCAL_HOSTS.includes(new URL(url).hostname)
}

/** コンテナの中から接続できる URL に直す（localhost はコンテナ自身を指してしまうため） */
export function toContainerUrl(url: string) {
  if (!isRemote(url)) {
    const parsed = new URL(url)
    parsed.hostname = HOST_FROM_CONTAINER
    return parsed.toString()
  }
  return url
}

function timestamp(now: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join('')
  const time = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('')
  return `${date}-${time}`
}

/** 既定の出力先。接続先と日時が分かる名前にして取り違えを防ぐ */
export function defaultDumpPath(url: string, { dataOnly, now }: { dataOnly: boolean; now: Date }) {
  const host = new URL(url).hostname.replace(/[^a-zA-Z0-9-]/g, '_')
  return `backups/${host}-${timestamp(now)}${dataOnly ? '-data' : ''}.sql`
}
