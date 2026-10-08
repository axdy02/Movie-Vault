import type { Metadata } from 'next'
import { Navigation } from '@/components/layout/navigation'
import { Footer } from '@/components/layout/footer'
import { getEditor } from '@/lib/auth/require-editor'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Movie Vault — Good films. Better company.',
    template: '%s · Movie Vault',
  },
  description:
    'A shared space for cinema. Discover films, explore the people behind them, and curate a personal movie vault together.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  ),
  openGraph: {
    title: 'Movie Vault',
    description:
      'Good films. Better company. A curated movie library, open for everyone to explore.',
    type: 'website',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const editor = await getEditor()
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Navigation editor={editor} />
        <main id="main" className="container main-content">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
