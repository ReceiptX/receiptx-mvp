import type { Metadata } from 'next'
import Providers from '../lib/privyProvider'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import CookieConsent from './components/CookieConsent'
import './globals.css'

export const metadata: Metadata = {
  title: 'ReceiptX – Turn Receipts into Rewards',
  description: 'Join ReceiptX to scan receipts, earn RWT rewards, and unlock analytics-powered NFTs.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-[#0B0C10] via-[#181A2A] to-[#232946] text-white min-h-screen flex flex-col">
        <Providers>
          <Navigation />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  )
}
