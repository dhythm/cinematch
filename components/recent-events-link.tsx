'use client'

import Link from 'next/link'
import { useMyEventIds } from '@/lib/my-events'

/**
 * 履歴があるときだけ出す。
 * ログインが無く端末ごとに別の履歴になるので、何も無い端末に導線だけ残さない。
 */
export function RecentEventsLink({ className }: { className?: string }) {
  const ids = useMyEventIds()
  if (ids.length === 0) return null

  return (
    <Link href="/#my-events" className={className}>
      最近のイベント
    </Link>
  )
}
