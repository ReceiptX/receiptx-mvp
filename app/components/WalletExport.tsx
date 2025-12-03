"use client";

import { useState } from "react";

export function WalletExport() {
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<'password' | '2fa'>('password');
  const [password, setPassword] = useState("");
  const [twofa, setTwofa] = useState("");
  const [exporting, setExporting] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setExporting(true);
    setError(null);
    setPrivateKey(null);
    try {
      const response = await fetch("/api/wallet/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: method === "password" ? password : undefined,
          twofa: method === "2fa" ? twofa : undefined,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setPrivateKey(data.privateKey);
      } else {
        setError(data.error || "Export failed");
      }
    } catch (err: any) {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (!showWarning) {
    return (
      <div className="max-w-md mx-auto p-4 bg-yellow-100 border border-yellow-400 rounded-xl mt-8">
        <h2 className="text-lg font-bold mb-2">Advanced: Export Your Private Key</h2>
        <p className="mb-4 text-sm text-yellow-800">
          Most users never need to access their private key. If you want to use your wallet in another app, you can export it here. <b>Never share your private key with anyone.</b>
        </p>
        <button className="bg-yellow-500 text-white px-4 py-2 rounded font-semibold" onClick={() => setShowWarning(true)}>
          I Understand, Continue
        </button>
      </div>
    );
  }

  if (!confirmed) {
    return (
      <div className="max-w-md mx-auto p-4 bg-white/10 rounded-xl mt-8">
        <h2 className="text-lg font-bold mb-2">Export Your Private Key</h2>
        <p className="mb-4 text-sm text-red-500">
          Warning: Your private key gives full control of your wallet. Never share it. We cannot recover it if you lose it.
        </p>
        <button className="bg-red-600 text-white px-4 py-2 rounded font-semibold" onClick={() => setConfirmed(true)}>
          I Accept the Risk
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xs mx-auto p-4 bg-white/10 rounded-xl mt-8">
      <label className="font-semibold">Email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="px-3 py-2 rounded" required placeholder="Enter your email" autoComplete="email" />
      <div className="flex gap-4 mb-2">
        <label>
          <input type="radio" checked={method === 'password'} onChange={() => setMethod('password')} /> Password
        </label>
        <label>
          <input type="radio" checked={method === '2fa'} onChange={() => setMethod('2fa')} /> 2FA Code
        </label>
      </div>
      {method === 'password' ? (
        <>
          <label className="font-semibold">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="px-3 py-2 rounded" required placeholder="Enter your password" autoComplete="current-password" />
        </>
      ) : (
        <>
          <label className="font-semibold">2FA Code</label>
          <input type="text" value={twofa} onChange={e => setTwofa(e.target.value)} className="px-3 py-2 rounded" required placeholder="Enter 2FA code" />
        </>
      )}
      <button type="submit" className="bg-cyan-600 text-white px-4 py-2 rounded font-semibold" disabled={exporting}>
        {exporting ? 'Exporting...' : 'Export Private Key'}
      </button>
      {privateKey && (
        <div className="text-green-500 text-sm break-all mt-2">
          <b>Your Private Key:</b>
          <div className="bg-gray-900 text-white p-2 rounded mt-1 select-all">{privateKey}</div>
        </div>
      )}
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </form>
  );
}
