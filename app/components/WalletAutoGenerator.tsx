
'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

export function WalletAutoGenerator() {
  const { user, authenticated } = usePrivy();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twofa, setTwofa] = useState('');
  const [method, setMethod] = useState<'password' | '2fa'>('password');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated && user?.email?.address && !walletAddress && !generating) {
      setEmail(user.email.address);
      setShowForm(true);
    }
  }, [authenticated, user, walletAddress, generating]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/wallet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: method === 'password' ? password : undefined,
          twofa: method === '2fa' ? twofa : undefined,
          biometrics: {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            screenResolution: `${window.screen.width}x${window.screen.height}`
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setWalletAddress(data.wallet.address);
        localStorage.setItem('receiptx_wallet', data.wallet.address);
        setShowForm(false);
      } else {
        setError(data.error || 'Wallet generation failed');
      }
    } catch (err: any) {
      setError('Wallet generation failed');
    } finally {
      setGenerating(false);
    }
  }

  if (!showForm) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-xs mx-auto p-4 bg-white/10 rounded-xl">
      <label className="font-semibold">Email</label>
      <input
        type="email"
        value={email}
        disabled
        className="px-3 py-2 rounded"
        placeholder="Your email"
        title="Your email address"
      />

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
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="px-3 py-2 rounded"
            required
            placeholder="Enter your password"
            title="Wallet password"
          />
        </>
      ) : (
        <>
          <label className="font-semibold">2FA Code</label>
          <input
            type="text"
            value={twofa}
            onChange={e => setTwofa(e.target.value)}
            className="px-3 py-2 rounded"
            required
            placeholder="Enter 2FA code"
            title="2FA code from your authenticator app"
          />
        </>
      )}

      <button type="submit" className="bg-cyan-600 text-white px-4 py-2 rounded font-semibold" disabled={generating}>
        {generating ? 'Generating...' : 'Generate Wallet'}
      </button>
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </form>
  );
}
