'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navigation() {
  const { authenticated, login, logout } = usePrivy();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 bg-[#0B0C10]/95 backdrop-blur border-b border-cyan-400/20 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-cyan-400">ReceiptX</span>
          </Link>

          {/* Navigation Links */}
          {authenticated ? (
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-gray-300 hover:text-cyan-400 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/receipts/scan"
                className="text-gray-300 hover:text-cyan-400 transition"
              >
                Scan Receipt
              </Link>
              <Link
                href="/rewards"
                className="text-gray-300 hover:text-cyan-400 transition"
              >
                Rewards
              </Link>
              <Link
                href="/nfts"
                className="text-gray-300 hover:text-cyan-400 transition"
              >
                NFTs
              </Link>
              <Link
                href="/staking"
                className="text-gray-300 hover:text-cyan-400 transition"
              >
                Staking
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition font-semibold"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/landing"
                className="text-gray-300 hover:text-cyan-400 transition"
              >
                About
              </Link>
              <button
                onClick={login}
                className="px-6 py-2 bg-cyan-400 text-black rounded-lg hover:bg-cyan-300 transition font-semibold"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
