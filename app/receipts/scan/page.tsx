'use client'

import { useState, useRef, useEffect } from 'react'

// ReceiptX SVG Logo (site-matching gradient)
const ReceiptXLogo = () => (
  <svg
    width="180"
    height="76"
    viewBox="0 0 900 380"
    className="mb-6 drop-shadow-xl"
    style={{ display: 'block', margin: '0 auto', maxWidth: '320px', height: 'auto' }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="rxSiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22d3ee"/>
        <stop offset="50%" stopColor="#6366f1"/>
        <stop offset="100%" stopColor="#a21caf"/>
      </linearGradient>
      <radialGradient id="softHalo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18"/>
        <stop offset="100%" stopColor="#a21caf" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <g>
      <circle cx="130" cy="130" r="130" fill="url(#softHalo)" transform="translate(150,80)"/>
      <polygon points="130,20 230,80 230,180 130,240 30,180 30,80" fill="#181A2A" transform="translate(150,80)"/>
      <polygon points="130,32 218,84 218,176 130,228 42,176 42,84" stroke="url(#rxSiteGrad)" strokeWidth="14" fill="#0B0C10" transform="translate(150,80)"/>
      <polyline points="42,84 130,130 130,228 42,176" stroke="url(#rxSiteGrad)" strokeWidth="12" fill="none" transform="translate(150,80)"/>
      <polyline points="218,84 130,130 130,228 218,176" stroke="url(#rxSiteGrad)" strokeWidth="12" fill="none" transform="translate(150,80)"/>
      <circle cx="130" cy="130" r="16" fill="#0B0C10" stroke="url(#rxSiteGrad)" strokeWidth="7" transform="translate(150,80)"/>
      <circle cx="168" cy="108" r="14" fill="#0B0C10" stroke="url(#rxSiteGrad)" strokeWidth="7" transform="translate(150,80)"/>
      <circle cx="98" cy="166" r="14" fill="#0B0C10" stroke="url(#rxSiteGrad)" strokeWidth="7" transform="translate(150,80)"/>
    </g>
    <text x="420" y="175" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontWeight="700" fontSize="85" letterSpacing="4" fill="url(#rxSiteGrad)">RECEIPTX</text>
    <text x="410" y="245" fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif" fontSize="28" letterSpacing="4" fill="#B9BAC1">REWARDS • ANALYTICS • AI</text>
  </svg>
);
import { usePrivy } from '@privy-io/react-auth';

export default function ReceiptScanPage() {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { authenticated, ready } = usePrivy();

  useEffect(() => {
    if (ready && authenticated && inputRef.current && !file) {
      inputRef.current.click();
    }
  }, [ready, authenticated, file]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'
  ];

  const handleFile = (event: any) => {
    const f = event.target.files?.[0];
    if (!f) return;

    if (f.size > MAX_FILE_SIZE) {
      setError('File too large. Maximum size is 10MB.');
      setFile(null);
      setPreview(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(f.type)) {
      setError('Unsupported file type. Only images (JPEG, PNG, WebP, HEIC) and PDFs are allowed.');
      setFile(null);
      setPreview(null);
      return;
    }

    setError(null);
    // ...existing code...
  }
  // ...existing code...
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  // Only one return statement at the end:
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946] text-white p-6 flex flex-col items-center justify-center">
      <ReceiptXLogo />
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 text-center drop-shadow">Scan Your Receipt</h1>
      <p className="text-base text-slate-200 mb-6 text-center max-w-lg">
        <span className="block text-lg font-medium mb-2">Snap a photo or upload your receipt to earn <span className="text-cyan-300 font-bold">RWT</span> tokens!</span>
        <span className="text-xs text-cyan-200 block mb-1">Max file size: 10MB. Supported: JPEG, PNG, WebP, HEIC.</span>
        <span className="text-xs text-yellow-200 block">On Telegram: Tap the button and select <b>Camera</b> for the fastest experience.</span>
      </p>

      {!preview && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full max-w-xs px-8 py-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 hover:from-cyan-300 hover:to-purple-600 text-white text-2xl font-bold shadow-2xl flex flex-col items-center gap-2 mb-6 transition border-2 border-cyan-300/40"
          style={{ minHeight: 80 }}
        >
          <span className="text-4xl drop-shadow">📷</span>
          <span>Take Photo or Upload</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {preview && (
        <div className="w-full max-w-xs flex flex-col items-center mb-6">
          <img
            src={preview}
            alt="Receipt preview"
            className="rounded-xl border-4 border-cyan-400 max-h-96 w-full object-contain shadow-2xl bg-[#181A2A]"
          />
          <button
            onClick={() => {
              setPreview(null);
              setFile(null);
            }}
            className="mt-3 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-600 text-white rounded-lg font-semibold text-sm shadow border border-red-300/40"
          >
            Retake / Choose Another
          </button>
        </div>
      )}

      <button
        onClick={submitReceipt}
        disabled={loading || !file}
        className="w-full max-w-xs px-6 py-4 rounded-xl bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 hover:from-green-300 hover:to-teal-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xl font-bold shadow-xl mb-2 border-2 border-green-300/40"
      >
        {loading ? 'Processing...' : 'Submit Receipt'}
      </button>

      {error && (
        <div className="mt-4 bg-gradient-to-r from-red-900/80 to-pink-900/60 border border-red-500 text-red-100 p-4 rounded-lg max-w-xs text-center shadow">
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 bg-gradient-to-r from-green-900/80 to-teal-900/60 border border-green-500 text-green-100 p-4 rounded-lg max-w-xs text-center shadow">
          <p>✅ Receipt processed! RWT earned: <b>{result.rwt_earned}</b></p>
        </div>
      )}
    </main>
  );

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
