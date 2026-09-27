const LINKS = [
  { href: 'https://github.com/dhythm/cinematchan', label: 'GitHub' },
  { href: 'https://x.com/dhythm_dev', label: 'X (@dhythm_dev)' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-2">
            {'映画データ: '}
            <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
              {/* TMDB の利用規約により、出典は公式ロゴで示す（色・比率を変えずに使う） */}
              {/** biome-ignore lint/performance/noImgElement: 固定サイズの静的 SVG なので最適化は不要 */}
              <img src="/tmdb-logo.svg" alt="TMDB" width={108} height={14} className="h-3.5 w-auto" />
            </a>
          </span>
          <nav aria-label="問い合わせ先" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {LINKS.map(({ href, label }) => (
              <a key={href} href={href} target="_blank" rel="noreferrer" className="underline">
                {label}
              </a>
            ))}
          </nav>
        </div>
        <p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>
    </footer>
  )
}
