'use client'
import dynamic from 'next/dynamic'

const TelegramMiniApp = dynamic(() => import('./TelegramInner'), {
  ssr: false
})

export default TelegramMiniApp
