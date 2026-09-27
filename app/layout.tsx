import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { DM_Mono, Zen_Maru_Gothic } from 'next/font/google'
import { Providers } from '@/components/providers'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const zenMaru = Zen_Maru_Gothic({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-zen-maru',
  display: 'swap',
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'しねまっちゃん | みんなで映画に行く日をきめよう',
  description: '公開予定の映画を選んで、公開日から1〜2週間の中で仲間と観に行ける日を調整・決定できる日程調整アプリ。',
  icons: {
    // 背景が透過なのでライト/ダークどちらでも同じ絵を使う
    icon: [
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '256x256', type: 'image/png' },
    ],
    // iOS のホーム画面は透過を黒で塗るため、テーマ色を敷いた不透明な画像を渡す
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#fdf8f4',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja" className={`${zenMaru.variable} ${dmMono.variable} bg-background`}>
      <body className="min-h-dvh antialiased">
        <Providers>
          <SiteHeader />
          {children}
          <SiteFooter />
        </Providers>
        <Toaster position="top-center" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
