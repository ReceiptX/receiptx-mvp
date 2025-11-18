'use client'

import { useState, useEffect } from 'react'
import { WebApp } from '@twa-dev/sdk'

export default function TelegramInner() {
  // -----------------------------
  // 1. STATE VARIABLES
  // -----------------------------
  const [telegramId, setTelegramId] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // -----------------------------
  // 2. TELEGRAM INITIALIZATION
  // -----------------------------
  useEffect(() => {
    try {
      WebApp.ready()
      const user = WebApp.initDataUnsafe?.user
      if (user) {
        setTelegramId(String(user.id))
      }
    } catch (err) {
      console.error("Telegram SDK error:", err)
    }
  }, [])

  // -----------------------------
  // 3. HANDLE RECEIPT IMAGE UPLOAD
  // -----------------------------
  const handleImageUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)

    const reader = new FileReader()

    reader.onloadend = async () => {
      try {
        const base64 = reader.result

        // -----------------------------
        // Step A: OCR → extract brand, amount
        // -----------------------------
        const ocrRes = await fetch('/api/ocr/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 })
        })

        const ocr = await ocrRes.json()

        if (!ocr.success) {
          alert("OCR failed. Try a clearer image.")
          return setLoading(false)
        }

        // -----------------------------
        // Step B: Insert into Supabase
        // -----------------------------
        const submitRes = await fetch('/api/receipts/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brand: ocr.brand,
            amount: ocr.amount,
            multiplier: ocr.multiplier,
            location: ocr.location,
            telegram_id: telegramId,
            wallet_address: "pending-wallet",
            metadata: ocr
          })
        })

        const submit = await submitRes.json()

        if (!submit.success) {
          alert("Database error: " + submit.error)
          return setLoading(false)
        }

        // -----------------------------
        // Step C: Notify user
        // -----------------------------
        alert(`Success! You earned rewards for ${ocr.brand}.`)

      } catch (error: any) {
        console.error("Upload error:", error)
        alert("Something went wrong.")
      } finally {
        setLoading(false)
      }
    }

    reader.readAsDataURL(file)
  }

  // -----------------------------
  // 4. UI RENDER
  // -----------------------------
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-10">
      <h1 className="text-cyan-400 text-2xl font-bold mb-6">
        ReceiptX Rewards
      </h1>

      {loading && (
        <p className="text-gray-400 animate-pulse mb-6">
          Processing receipt...
        </p>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        id="receipt-upload"
        accept="image/*"
        capture="camera"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Button that triggers the file input */}
      <label
        htmlFor="receipt-upload"
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 text-white cursor-pointer hover:opacity-90 transition-all"
      >
        📸 Scan Receipt
      </label>
    </main>
  )
}

