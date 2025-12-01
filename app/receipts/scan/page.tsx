'use client'

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { usePrivy } from '@privy-io/react-auth';
import dynamic from 'next/dynamic';
const CameraCapture = dynamic(() => import('./CameraCapture'), { ssr: false });


export default function ReceiptScanPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { authenticated, ready } = usePrivy();

  // Accepts base64 image from CameraCapture and sets preview
  const handleCameraPhoto = (dataUrl: string) => {
    setPreview(dataUrl);
    setFile(null); // Camera photo is not a File, but we treat preview as the source
    setError(null);
  };


  // Only auto-open file picker if not using camera
  useEffect(() => {
    if (ready && authenticated && inputRef.current && !file && !preview) {
      inputRef.current.click();
    }
  }, [ready, authenticated, file, preview]);

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
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submitReceipt = async () => {
    try {
      setLoading(true);
      setError(null);

      // If user chose a file from device
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/ocr/process', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Receipt processing failed');
        }
        
        setResult(data);
        return;
      }

      // If preview is a base64 data URL (camera)
      if (preview) {
        const res = await fetch('/api/ocr/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: preview }),
        });

        if (!res.ok) {
          throw new Error(`Server error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Receipt processing failed');
        }
        
        setResult(data);
        return;
      }

      setError('No photo or file selected to submit.');
    } catch (err: any) {
      console.error('submitReceipt error', err);
      
      // Provide more specific error messages
      if (err.message === 'Failed to fetch' || err.message.includes('fetch failed')) {
        setError('Unable to connect to server. Please check your internet connection and try again.');
      } else if (err.message.includes('Server error')) {
        setError(`Server error: ${err.message}. Please try again later.`);
      } else {
        setError(err?.message || 'Failed to submit receipt. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Only one return statement at the end:
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946] text-white p-6 flex flex-col items-center justify-center">
      <Image
        src="/logo.svg"
        alt="ReceiptX Logo"
        width={240}
        height={60}
        className="w-60 max-w-xs h-auto mb-6 drop-shadow-xl object-contain"
        priority
      />
      <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4 text-center drop-shadow">Scan Your Receipt</h1>
      <p className="text-base text-slate-200 mb-6 text-center max-w-lg">
        <span className="block text-lg font-medium mb-2">Snap a photo or upload your receipt to earn <span className="text-cyan-300 font-bold">RWT</span> tokens!</span>
        <span className="text-xs text-cyan-200 block mb-1">Max file size: 10MB. Supported: JPEG, PNG, WebP, HEIC.</span>
        <span className="text-xs text-yellow-200 block">On Telegram: Tap the button and select <b>Camera</b> for the fastest experience.</span>
      </p>

      {/* Camera/photo upload UI */}
      {!preview && (
        <div className="w-full max-w-xs mb-6">
          <CameraCapture onPhotoUpload={handleCameraPhoto} />
        </div>
      )}

      {/* Fallback file upload for non-camera users */}
      {!preview && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full max-w-xs px-8 py-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 hover:from-cyan-300 hover:to-purple-600 text-white text-2xl font-bold shadow-2xl flex flex-col items-center gap-2 mb-6 transition border-2 border-cyan-300/40 min-h-20"
          >
            <span className="text-4xl drop-shadow">📁</span>
            <span>Upload from Device</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
            placeholder="Upload receipt image"
          />
        </>
      )}

      {/* Preview and retake/clear option */}
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

      {/* Results */}
      {error && (
        <div className="mt-4 bg-gradient-to-r from-red-900/80 to-pink-900/60 border border-red-500 text-red-100 p-4 rounded-lg max-w-xs text-center shadow">
          <p>{error}</p>
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

      {result && !result.reward && !result.success && (
        <div className="mt-6 bg-yellow-900/20 border border-yellow-700 p-4 rounded-lg">
          <h2 className="text-xl font-semibold text-yellow-400 mb-2">⚠️ Processing Issue</h2>
          <p className="text-gray-300 mb-2">
            {result.error || 'Receipt could not be processed. Please try again.'}
          </p>
          {result.error && (
            <details className="mt-2">
              <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap bg-gray-900 p-3 rounded">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </main>
  )
}
