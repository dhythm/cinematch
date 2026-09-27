export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-xs text-muted-foreground">
        <p>
          {'映画データ: '}
          <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer" className="underline">
            TMDB
          </a>
        </p>
        <p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
      </div>
    </footer>
  )
}
