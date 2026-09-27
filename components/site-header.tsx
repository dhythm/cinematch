import { Popcorn } from 'lucide-react'
import Link from 'next/link'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="しねまっち ホーム" className="flex items-center gap-2 font-black">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Popcorn className="size-5" aria-hidden />
          </span>
          <span className="whitespace-nowrap text-xl tracking-wide" aria-hidden>
            しねま<span className="text-primary">っち</span>
          </span>
        </Link>
        <nav aria-label="メイン" className="flex items-center gap-0.5 whitespace-nowrap text-sm font-medium">
          <Link
            href="/#releases"
            className="rounded-full px-2.5 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground sm:px-3"
          >
            公開予定
          </Link>
          <Link
            href="/#my-events"
            className="rounded-full px-2.5 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground sm:px-3"
          >
            マイ調整
          </Link>
        </nav>
      </div>
    </header>
  )
}
