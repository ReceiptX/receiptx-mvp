'use client'

import React, { useEffect } from 'react'
import Providers from '../lib/privyProvider'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 🧹 Suppress harmless hydration warnings
    const originalError = console.error
    console.error = (...args) => {
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
      <body className="bg-[#0B0C10] text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
