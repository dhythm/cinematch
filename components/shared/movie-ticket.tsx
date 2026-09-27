import Image from 'next/image'
import { formatJaDate } from '@/lib/date'
import type { Movie } from '@/lib/types'

export function MovieTicket({ movie, children }: { movie: Movie; children?: React.ReactNode }) {
  return (
    <div className="ticket-notch flex overflow-hidden rounded-2xl bg-primary text-primary-foreground">
      <div className="relative w-24 shrink-0 sm:w-32">
        <Image
          src={movie.poster || '/placeholder.svg'}
          alt={`${movie.title}のポスター`}
          fill
          sizes="128px"
          className="object-cover"
          priority
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 border-l-2 border-dashed border-primary-foreground/25 p-4 pl-6 sm:p-6 sm:pl-8">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] tracking-widest text-primary-foreground/80 uppercase">
            {movie.originalTitle ?? 'Now scheduling'}
          </p>
          <h1 className="text-xl font-black leading-tight text-balance sm:text-2xl">{movie.title}</h1>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-xs">
          <div className="flex flex-col gap-0.5">
            <dt className="text-primary-foreground/60">公開日</dt>
            <dd className="font-mono font-medium">{formatJaDate(movie.releaseDate)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-primary-foreground/60">上映時間</dt>
            <dd className="font-mono font-medium">{`${movie.runtime}分`}</dd>
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-primary-foreground/60">配給</dt>
            <dd className="truncate font-medium">{movie.distributor}</dd>
          </div>
        </dl>
        {children}
      </div>
    </div>
  )
}
