"use client";

import { useState } from "react";

export function WalletRecovery() {
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<'password' | '2fa'>('password');
  const [password, setPassword] = useState("");
  const [twofa, setTwofa] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRecovering(true);
    setError(null);
    setWalletAddress(null);
    try {
      const response = await fetch("/api/wallet/recover", {
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
        setWalletAddress(data.wallet.address);
      } else {
        setError(data.error || "Wallet recovery failed");
      }
    } catch (err: any) {
      setError("Wallet recovery failed");
    } finally {
      setRecovering(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xs mx-auto p-4 bg-white/10 rounded-xl mt-8">
      <h2 className="text-lg font-bold mb-2">Recover Your Wallet</h2>
      <label className="font-semibold">Email</label>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="px-3 py-2 rounded" required />
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
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="px-3 py-2 rounded" required />
        </>
      ) : (
        <>
          <label className="font-semibold">2FA Code</label>
          <input type="text" value={twofa} onChange={e => setTwofa(e.target.value)} className="px-3 py-2 rounded" required />
        </>
      )}
      <button type="submit" className="bg-cyan-600 text-white px-4 py-2 rounded font-semibold" disabled={recovering}>
        {recovering ? 'Recovering...' : 'Recover Wallet'}
      </button>
      {walletAddress && (
        <div className="text-green-500 text-sm break-all mt-2">Recovered Address: {walletAddress}</div>
      )}
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </form>
  );
}
