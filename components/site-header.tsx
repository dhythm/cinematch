import Image from 'next/image'
import Link from 'next/link'
import { RecentEventsLink } from '@/components/recent-events-link'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="しねまっちゃん ホーム" className="flex items-center gap-2 font-black">
          {/* リンク自体に aria-label があるので、画像は装飾として扱う */}
          <Image src="/icon.png" alt="" width={36} height={36} className="size-9" priority />
          <span className="whitespace-nowrap text-xl tracking-wide" aria-hidden>
            しねま<span className="text-primary">っちゃん</span>
          </span>
        </Link>
        <nav aria-label="メイン" className="flex items-center gap-0.5 whitespace-nowrap text-sm font-medium">
          <Link
            href="/#releases"
            className="rounded-full px-2.5 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground sm:px-3"
          >
            公開予定
          </Link>
          <RecentEventsLink className="rounded-full px-2.5 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground sm:px-3" />
        </nav>
      </div>
    </header>
  )
}
