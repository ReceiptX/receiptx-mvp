'use client'

import React, { useEffect } from 'react'
import Providers from '../lib/privyProvider'
import { WalletAutoGenerator } from './components/WalletAutoGenerator'
import Navigation from './components/Navigation'
import Footer from './components/Footer'
import CookieConsent from './components/CookieConsent'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 🧹 Suppress harmless hydration warnings
    const originalError = console.error.bind(console)
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes("didn't match the client properties") ||
          args[0].includes('A tree hydrated but some attributes') ||
          args[0].includes('cannot be a descendant of') ||
          args[0].includes('hydration error'))
      ) {
        return
      }
      originalError(...args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-[#0B0C10] via-[#181A2A] to-[#232946] text-white min-h-screen flex flex-col">
        <Providers>
          {/* <WalletAutoGenerator /> removed from global layout */}
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
