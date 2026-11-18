import type { Metadata, Viewport } from 'next'
import { DM_Sans, Space_Mono, Syne } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-syne',
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'VAULTEX',
  description: 'Manage your digital assets. Early access.',
  keywords: 'crypto wallet, DeFi, token swap, virtual card, Bitcoin, Ethereum',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'VAULTEX' },
  openGraph: { title: 'VAULTEX', description: 'Manage your digital assets. Early access.', type: 'website' },
}

export const viewport: Viewport = {
  themeColor: '#00F0FF',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${syne.variable} ${spaceMono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={dmSans.className}>{children}</body>
    </html>
  )
}
