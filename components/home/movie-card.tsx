import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Movie } from '@/lib/types'

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <article className="group h-full">
      {/* カード全体（ポスター画像を含む）をイベント作成ページへのリンクにする */}
      <Link
        href={`/new?movie=${movie.id}`}
        className="flex h-full flex-col gap-3 rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted ring-primary ring-offset-2 ring-offset-background transition-shadow group-hover:ring-2">
          <Image
            src={movie.poster || '/placeholder.svg'}
            alt={`${movie.title}のポスター`}
            fill
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* クリックできることが分かるよう、ホバー・フォーカス時に行き先を重ねて示す */}
          <span
            className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-3 text-xs font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            aria-hidden
          >
            この映画で日程をきめる
            <ArrowRight className="size-4" />
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <h4 className="font-bold leading-snug text-pretty group-hover:underline">{movie.title}</h4>
          <p className="font-mono text-xs text-muted-foreground">
            {[movie.runtime && `${movie.runtime}min`, movie.genres.join(' / ')].filter(Boolean).join(' · ')}
          </p>
        </div>
      </Link>
    </article>
  )
}
