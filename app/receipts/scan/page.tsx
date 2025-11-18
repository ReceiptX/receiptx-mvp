'use client'

import { useState } from 'react'

export default function ReceiptScanPage() {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (event: any) => {
    const f = event.target.files?.[0]
    if (!f) return

    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const submitReceipt = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle duplicate receipt specifically
        if (res.status === 409 && data.duplicate) {
          throw new Error("⚠️ This receipt was already submitted. Each receipt can only be scanned once to prevent fraud.")
        }
        throw new Error(data.error || "Processing failed")
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#0B0C10] text-white p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-4">Scan Your Receipt</h1>

      <p className="text-gray-400 mb-6">
        Take a photo or upload an image of your receipt to earn RWT tokens!
      </p>

      {/* File Upload Options */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Mobile Camera Button */}
        <label className="cursor-pointer">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-6 rounded-xl 
                          text-center hover:opacity-90 transition-all shadow-lg">
            <div className="text-5xl mb-2">📸</div>
            <p className="text-xl font-bold">Take Photo</p>
            <p className="text-sm text-cyan-100 mt-1">Use your camera</p>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="hidden"
          />
        </label>

        {/* File Upload Button */}
        <label className="cursor-pointer">
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 rounded-xl 
                          text-center hover:opacity-90 transition-all shadow-lg">
            <div className="text-5xl mb-2">🖼️</div>
            <p className="text-xl font-bold">Upload Image</p>
            <p className="text-sm text-purple-100 mt-1">Choose from gallery</p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </label>

        {preview && (
          <div className="mt-4">
            <img
              src={preview}
              alt="Receipt preview"
              className="rounded-lg border-2 border-cyan-500 max-h-96 w-full object-contain shadow-xl"
            />
            <button
              onClick={() => {
                setPreview(null);
                setFile(null);
              }}
              className="mt-2 text-red-400 hover:text-red-300 text-sm"
            >
              ✕ Remove image
            </button>
          </div>
        )}
      </div>

      <button
        onClick={submitReceipt}
        disabled={loading || !file}
        className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 
                   hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed
                   text-xl font-bold shadow-lg"
      >
        {loading ? "Processing Receipt..." : "🚀 Submit & Earn RWT"}
      </button>

      {/* Results */}
      {error && (
        <div className="mt-6 bg-red-900/20 border border-red-500/50 p-4 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {result && result.reward && (
        <div className="mt-6 space-y-4">
          {/* 🎉 Reward Celebration Card */}
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 rounded-2xl shadow-2xl text-center animate-pulse">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
            <p className="text-xl mb-6">You earned</p>
            <div className="text-7xl font-black mb-4">
              {result.reward.total_rwt.toFixed(2)}
            </div>
            <p className="text-3xl font-semibold">RWT Tokens</p>
            
            {result.reward.multiplier > 1 && (
              <div className="mt-6 bg-white/20 backdrop-blur-sm p-4 rounded-xl">
                <p className="text-lg">
                  🔥 <strong>{result.reward.multiplier}x</strong> Bonus from <strong>{result.reward.brand}</strong>!
                </p>
                <p className="text-sm mt-2">
                  Base: {result.reward.base_rwt.toFixed(2)} RWT × {result.reward.multiplier} = {result.reward.total_rwt.toFixed(2)} RWT
                </p>
              </div>
            )}
          </div>

          {/* Receipt Details */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold text-cyan-400 mb-4">Receipt Details</h3>
            <div className="space-y-2 text-gray-300">
              <p><strong>Brand:</strong> {result.data.brand}</p>
              <p><strong>Amount:</strong> ${result.data.amount.toFixed(2)}</p>
              <p><strong>Multiplier:</strong> {result.data.multiplier}x</p>
              <p><strong>Receipt ID:</strong> {result.data.id.slice(0, 8)}...</p>
            </div>
            
            {result.ocr_text && (
              <details className="mt-4">
                <summary className="cursor-pointer text-cyan-400 hover:text-cyan-300">
                  View OCR Text
                </summary>
                <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap bg-gray-900 p-3 rounded">
                  {result.ocr_text}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      {result && !result.reward && (
        <div className="mt-6 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">⚠️ Processing Issue</h2>
          <pre className="text-sm whitespace-pre-wrap text-gray-300">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  )
}
