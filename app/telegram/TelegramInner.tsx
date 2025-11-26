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
  const [showShop, setShowShop] = useState<boolean>(false)
  const [products, setProducts] = useState<any[]>([])
  const [userEmail, setUserEmail] = useState<string | null>(null)

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
  // 2B. LOAD PRODUCTS
  // -----------------------------
  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/telegram/products')
        const data = await res.json()
        if (data.products) {
          setProducts(data.products)
        }
      } catch (error) {
        console.error('Failed to load products:', error)
      }
    }
    loadProducts()
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
  // 4. HANDLE PURCHASE
  // -----------------------------
  const handlePurchase = async (productKey: string) => {
    if (!WebApp.initDataUnsafe?.user) {
      alert('User data not available')
      return
    }

    try {
      // Create invoice
      const res = await fetch('/api/telegram/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_key: productKey,
          user_email: userEmail,
          telegram_id: telegramId,
          wallet_address: walletAddress
        })
      })

      const data = await res.json()
      
      if (!data.success) {
        alert('Failed to create invoice: ' + (data.error || 'Unknown error'))
        return
      }

      // Open Telegram payment UI
      WebApp.openInvoice(data.invoice, (status: string) => {
        if (status === 'paid') {
          alert('🎉 Purchase successful! Your rewards have been activated.')
          setShowShop(false)
          // Refresh the page to show new rewards
          window.location.reload()
        } else if (status === 'cancelled') {
          alert('Purchase cancelled')
        } else if (status === 'failed') {
          alert('Payment failed. Please try again.')
        }
      })
    } catch (error) {
      console.error('Purchase error:', error)
      alert('Failed to initiate purchase')
    }
  }

  // -----------------------------
  // 5. UI RENDER
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
        <div className="mb-6 p-4 bg-rxCard rounded-lg border border-rxBlue/20">
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

      {/* Shop Button */}
      <button
        onClick={() => setShowShop(true)}
        className="mt-4 px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl text-gray-900 font-semibold hover:opacity-90 transition-all"
      >
        💎 Shop
      </button>

      {/* Shop Modal */}
      {showShop && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-rxCard rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">💎 ReceiptX Shop</h2>
              <button
                onClick={() => setShowShop(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-[#0B0C10] rounded-lg p-4 border border-cyan-400/20 hover:border-cyan-400/40 transition-all"
                >
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    {product.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <div className="text-yellow-400 font-bold">
                      ⭐ {product.price_stars} Stars
                      <span className="text-xs text-gray-500 ml-2">
                        (${product.price_usd})
                      </span>
                    </div>
                    <button
                      onClick={() => handlePurchase(product.product_key)}
                      className="px-4 py-2 bg-cyan-400 text-gray-900 rounded-lg font-semibold hover:bg-cyan-300 transition-all"
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {products.length === 0 && (
              <p className="text-gray-400 text-center py-8">
                No products available at the moment.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Telegram-specific info */}
      {telegramId && (
        <p className="mt-6 text-xs text-gray-500">
          Telegram ID: {telegramId}
        </p>
      )}
    </main>
  )
}

