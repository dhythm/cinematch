'use client'

import { useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ShareBar({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://cinematch.app/e/${eventId}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard may be blocked inside the preview iframe; still show feedback.
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-card p-2 pl-4">
      <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="min-w-0 flex-1 truncate font-mono text-sm" aria-label="共有URL">
        {url}
      </p>
      <Button type="button" size="sm" onClick={copy} className="shrink-0">
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? 'コピーしました' : 'URLをコピー'}
      </Button>
    </div>
  )
}
