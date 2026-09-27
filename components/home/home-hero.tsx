import { CalendarHeart, Clapperboard, PartyPopper } from 'lucide-react'

const STEPS = [
  { icon: Clapperboard, title: 'えいがをえらぶ', body: '公開予定の作品から、観たい1本をタップ' },
  { icon: CalendarHeart, title: 'こうほびをつくる', body: '公開日から1〜2週間の日付と時間帯をおまかせ提案' },
  { icon: PartyPopper, title: 'みんなできめる', body: 'URLを送って○△×で回答。いちばん集まる回に決定！' },
]

export function HomeHero() {
  return (
    <section aria-labelledby="hero-title" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">しねま × まっち</p>
        <h1 id="hero-title" className="text-3xl font-black leading-snug text-balance md:text-5xl md:leading-tight">
          {'観たい映画、'}
          <br className="md:hidden" />
          <span className="rounded-lg bg-accent px-1.5">みんなで行ける日</span>
          {'をきめよう。'}
        </h1>
        <p className="max-w-xl leading-relaxed text-muted-foreground text-pretty">
          公開スケジュールから作品を選ぶだけで、初週〜2週目の候補日がそろいます。あとはURLを送って、なかまの都合をあつめるだけ。
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <step.icon className="size-5" aria-hidden />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-bold">
                <span className="mr-1.5 text-primary">{`${i + 1}.`}</span>
                {step.title}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
