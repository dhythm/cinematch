import { ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import type { Movie } from '@/lib/types'
import { cn } from '@/lib/utils'

export function MovieCard({ movie }: { movie: Movie }) {
  return (
    <article className="group flex h-full flex-col gap-3">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
        <Image
          src={movie.poster || '/placeholder.svg'}
          alt={`${movie.title}のポスター`}
          fill
          sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {movie.source === 'tmdb' && (
          <span className="absolute top-2 left-2 rounded bg-primary/85 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-primary-foreground uppercase backdrop-blur">
            TMDB
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h4 className="font-bold leading-snug text-pretty">{movie.title}</h4>
        <p className="font-mono text-xs text-muted-foreground">
          {[movie.runtime && `${movie.runtime}min`, movie.genres.join(' / ')].filter(Boolean).join(' · ')}
        </p>
      </div>
      <Link
        href={`/new?movie=${movie.id}`}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-9 w-full justify-between bg-card group-hover:border-primary',
        )}
      >
        日程を調整する
        <ArrowRight aria-hidden />
      </Link>
    </article>
  )
}
