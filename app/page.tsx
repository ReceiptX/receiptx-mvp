'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

export default function Home() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready) setLoading(false);
  }, [ready]);

  // Step 1: Wait for Privy to initialize
  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] text-white">
        <p className="text-gray-400 animate-pulse">Initializing ReceiptX...</p>
      </main>
    );
  }

  // Step 2: If not authenticated
  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] text-white">
        <h1 className="text-4xl font-bold text-cyan-400 mb-6">ReceiptX</h1>
        <p className="text-gray-400 mb-8">
          Turn your everyday receipts into crypto rewards ⚡
        </p>
        <button
          onClick={login}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 transition-all"
        >
          Continue with Email
        </button>
      </main>
    );
  }

  // Step 3: Authenticated state
  const email = user?.email?.address || '';
  const wallet = user?.wallet?.address || '';
  const userDisplay = email || wallet || 'User';

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0B0C10] text-white">
      <h1 className="text-4xl font-bold text-cyan-400 mb-6">Welcome to ReceiptX</h1>
      <p className="text-gray-400 mb-8">
        Hello, {userDisplay} 👋
      </p>

      <div className="flex flex-col gap-4">
        <Link
          href="/receipts/scan"
          className="bg-gradient-to-r from-green-400 to-teal-500 px-6 py-3 rounded-xl text-center hover:opacity-90 transition-all"
        >
          📸 Scan a Receipt
        </Link>

        <Link
          href="/business/dashboard"
          className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 rounded-xl text-center hover:opacity-90 transition-all"
        >
          📊 View Analytics
        </Link>

        <Link
          href="/telegram"
          className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 rounded-xl text-center hover:opacity-90 transition-all"
        >
          💫 Telegram Mini App
        </Link>

        <button
          onClick={logout}
          className="border border-gray-500 mt-6 px-4 py-2 rounded-lg hover:bg-gray-800 transition-all"
        >
          Log Out
        </button>
      </div>
    </main>
  );
}
