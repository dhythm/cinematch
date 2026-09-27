'use client'

import { Check, Copy, KeyRound, Link2 } from 'lucide-react'
import { useRef, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

const noop = () => () => {}

/** コピーできなかったときに、そのまま Cmd+C できるよう選択しておく */
function selectContents(node: Node | null) {
  if (!node) return
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(node)
  selection.removeAllRanges()
  selection.addRange(range)
}

/** 本番・プレビュー・ローカルのどこでも、表示中のサイトの URL を共有する（SSR 時はパスのみ） */
function useOrigin() {
  return useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => '',
  )
}

type Props = {
  /** 共有するパス（オリジンは表示中のサイトのもの） */
  path: string
  label: string
  /** 幹事用 URL など、他人に見せたくないもの */
  secret?: boolean
}

export function ShareBar({ path, label, secret = false }: Props) {
  const [copied, setCopied] = useState(false)
  const urlRef = useRef<HTMLSpanElement>(null)
  const url = `${useOrigin()}${path}`

  async function copy() {
    if (await copyText(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      return
    }
    // クリップボードを触れない環境（プライベートブラウジングや iframe の中など）では手動コピーに逃がす
    selectContents(urlRef.current)
    toast.error('コピーできませんでした', { description: 'URLを選択したので、そのままコピーしてください' })
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border border-dashed bg-card p-2 pl-4',
        secret ? 'border-accent-foreground/40' : 'border-primary/40',
      )}
    >
      {secret ? (
        <KeyRound className="size-4 shrink-0 text-accent-foreground" aria-hidden />
      ) : (
        <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <p className="min-w-0 flex-1 truncate font-mono text-sm">
        <span className="sr-only">{`${label} `}</span>
        {/* select-all で、タップ 1 回でも URL 全体を選べるようにする */}
        <span ref={urlRef} className="select-all">
          {url}
        </span>
      </p>
      <Button type="button" size="sm" onClick={copy} className="shrink-0">
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? 'コピーしました' : 'URLをコピー'}
      </Button>
    </div>
  )
}
