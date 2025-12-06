'use client';

import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import dynamic from 'next/dynamic';
import './telegram.css';

// Dynamic import to avoid SSR issues
const CameraCapture = dynamic(() => import('../components/CameraCapture'), { ssr: false });

interface TelegramProduct {
  id: string;
  name: string;
  description: string;
  price_stars: number;
  price_usd: number;
  product_key: string;
}

export default function TelegramInner() {
  // -----------------------------
  // 1. STATE VARIABLES
  // -----------------------------
  const [telegramId, setTelegramId] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [showShop, setShowShop] = useState<boolean>(false)
  const [products, setProducts] = useState<TelegramProduct[]>([])

  // -----------------------------
  // 2. TELEGRAM INITIALIZATION & MULTI-TENANT WALLET GENERATION
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
          const username = user.username || null
          const firstName = user.first_name || null
          const lastName = user.last_name || null
          
          setTelegramId(userId)
          
          // Step 1: Ensure user exists in database with telegram_id
          console.log('📱 Telegram user detected:', userId)
          
          // Step 2: Generate deterministic multi-tenant wallet
          // This uses the seamless wallet generator with telegram_id as the identifier
          const walletRes = await fetch('/api/wallet/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegram_id: userId,
              biometrics: {
                timestamp: Date.now(),
                platform: 'telegram',
                telegram_username: username,
                telegram_name: `${firstName || ''} ${lastName || ''}`.trim()
              }
            })
          })
          
          const walletData = await walletRes.json()
          if (walletData.success && walletData.wallet) {
            setWalletAddress(walletData.wallet.address)
            console.log('✅ Multi-tenant wallet generated/retrieved:', walletData.wallet.address)
            console.log('🔐 Wallet is deterministic based on telegram_id:', userId)
            
            // Optional: Store wallet address in Telegram local storage for quick access
            try {
              WebApp.CloudStorage?.setItem('wallet_address', walletData.wallet.address)
            } catch {
              // CloudStorage not available, no problem
            }
          } else {
            console.error('❌ Wallet generation failed:', walletData.error)
            // Still allow user to continue, but they won't have a wallet
          }
        } else {
          console.warn('⚠️ No Telegram user data available')
        }
      } catch (err) {
        console.error("❌ Initialization error:", err)
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
        const data = await res.json() as { products?: TelegramProduct[] }
        if (Array.isArray(data.products)) {
          setProducts(data.products)
        }
      } catch (error) {
        console.error('Failed to load products:', error)
      }
    }
    loadProducts()
  }, [])

  // -----------------------------
  // 3. HANDLE RECEIPT IMAGE CAPTURE (from Camera Component)
  // -----------------------------
  const handleReceiptCapture = async (file: File) => {
    if (!file) return

    setLoading(true)

    try {
      // Create FormData for multipart upload
      const formData = new FormData()
      formData.append('file', file)
      formData.append('telegram_id', telegramId || '')
      if (walletAddress) formData.append('wallet_address', walletAddress)

      // -----------------------------
      // Step A: Upload to OCR endpoint
      // -----------------------------
      const ocrRes = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData
      })

      const ocr = await ocrRes.json()

      if (!ocr.success) {
        alert("OCR failed. Try a clearer image.")
        setLoading(false)
        return
      }

      // -----------------------------
      // Step B: Success notification
      // -----------------------------
      const brand = ocr.brand || 'Unknown'
      const rwtEarned = ocr.rwt_earned || 0
      alert(`✅ Success! Receipt processed.\n🏪 Brand: ${brand}\n💰 RWT Earned: ${rwtEarned}`)

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error("Upload error:", message)
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Purchase error:', message)
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

      {/* Camera Component with Take Photo Button */}
      <div className="mb-6 w-full max-w-md">
        <CameraCapture 
          onCapture={handleReceiptCapture}
          disabled={loading}
        />
      </div>

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

