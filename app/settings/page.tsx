"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [has2FA, setHas2FA] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSetup2FA() {
    setStatus(null);
    setError(null);
    try {
      // Call API to get TOTP secret and QR
      const res = await fetch("/api/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (data.secret && data.qr) {
        setSecret(data.secret);
        setQr(data.qr);
        setShowSetup(true);
      } else {
        setError("Failed to get 2FA secret");
      }
    } catch {
      setError("Failed to get 2FA secret");
    }
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, secret }),
      });
      const data = await res.json();
      if (data.success) {
        setHas2FA(true);
        setStatus("2FA enabled!");
        setShowSetup(false);
      } else {
        setError(data.error || "Verification failed");
      }
    } catch {
      setError("Verification failed");
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white/10 rounded-xl mt-8">
      <h2 className="text-lg font-bold mb-4">Account Security Settings</h2>
      {!has2FA && !showSetup && (
        <button
          className="bg-cyan-600 text-white px-4 py-2 rounded font-semibold"
          onClick={handleSetup2FA}
        >
          Set up 2FA (TOTP)
        </button>
      )}
      {showSetup && (
        <form onSubmit={handleVerify2FA} className="flex flex-col gap-4 mt-4">
          <div>
            <div className="mb-2">Scan this QR code in your authenticator app:</div>
            {qr && <img src={qr} alt="2FA QR Code" className="mx-auto" />}
            <div className="mt-2 text-xs text-gray-500">Or enter secret: <span className="font-mono">{secret}</span></div>
          </div>
          <label className="font-semibold">Enter code from app</label>
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            className="px-3 py-2 rounded"
            required
            placeholder="Enter 2FA code"
          />
          <button type="submit" className="bg-cyan-600 text-white px-4 py-2 rounded font-semibold">
            Verify & Enable 2FA
          </button>
        </form>
      )}
      {has2FA && <div className="text-green-500 mt-4">2FA is enabled on your account.</div>}
      {status && <div className="text-green-500 mt-2">{status}</div>}
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
}
