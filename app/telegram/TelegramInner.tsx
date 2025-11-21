'use client';

import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import './telegram.css';

export default function TelegramInner() {
  // -----------------------------
  // 1. STATE VARIABLES
  // -----------------------------
  const [telegramId, setTelegramId] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // -----------------------------
  // 2. TELEGRAM INITIALIZATION & WALLET GENERATION
  // -----------------------------
  useEffect(() => {
    async function init() {
      try {
        WebApp.ready()
        
        // Force ReceiptX dark theme (override Telegram's theme)
        WebApp.setHeaderColor('#0B0C10') // Dark header to match web app
        WebApp.setBackgroundColor('#0B0C10') // Dark background
        
        const user = WebApp.initDataUnsafe?.user
        if (user) {
          const userId = String(user.id)
          setTelegramId(userId)
          
          // Auto-generate wallet for Telegram user
          const walletRes = await fetch('/api/wallet/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: userId,
              biometrics: {
                timestamp: Date.now(),
                platform: 'telegram'
              }
            })
          })
          
          const walletData = await walletRes.json()
          if (walletData.success) {
            setWalletAddress(walletData.wallet.address)
            console.log('✅ Wallet generated:', walletData.wallet.address)
          }
        }
      } catch (err) {
        console.error("Initialization error:", err)
      }
    }
    
    init()
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
            wallet_address: walletAddress || "pending-wallet",
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
    <main className="telegram-main min-h-screen flex flex-col items-center justify-center text-center p-10">

      {/* ReceiptX Branding */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="text-cyan-400">Receipt</span>
          <span className="text-white">X</span>
        </h1>
        <p className="text-gray-400 text-sm">Scan receipts, earn rewards</p>
      </div>

      {/* Wallet Status */}
      {walletAddress && (
        <div className="mb-6 p-4 bg-[#1F2833] rounded-lg border border-cyan-400/20">
          <p className="text-xs text-gray-400 mb-1">Your Wallet</p>
          <p className="text-cyan-400 font-mono text-xs">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
        </div>
      )}

      {loading && (
        <p className="text-gray-400 animate-pulse mb-6">
          🔍 Processing receipt...
        </p>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        id="receipt-upload"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Scan Button - ReceiptX Style */}
      <label
        htmlFor="receipt-upload"
        className="telegram-scan-button px-8 py-4 rounded-xl text-white cursor-pointer hover:opacity-90 transition-all font-semibold"
      >
        📸 Scan Receipt
      </label>

      {/* Telegram-specific info */}
      {telegramId && (
        <p className="mt-6 text-xs text-gray-500">
          Telegram ID: {telegramId}
        </p>
      )}
    </main>
  )
}

