'use client';

import { usePrivy } from '@privy-io/react-auth';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const isTestnet = process.env.NEXT_PUBLIC_NETWORK === 'testnet' || process.env.NODE_ENV !== 'production';

export default function Navigation() {
  const { authenticated, login, logout } = usePrivy();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 bg-gradient-to-r from-cyan-900 via-blue-900 to-purple-900/95 backdrop-blur border-b border-cyan-700/30 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-end">

          {/* Navigation Links */}
          {authenticated ? (
            <div className="flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-white hover:text-cyan-200 font-semibold transition"
              >
                Dashboard
              </Link>
              {!isTestnet && (
                <>
                  <Link
                    href="/receipts/scan"
                    className="text-white hover:text-cyan-200 font-semibold transition"
                  >
                    Scan Receipt
                  </Link>
                  <Link
                    href="/rewards"
                    className="text-white hover:text-cyan-200 font-semibold transition"
                  >
                    Rewards
                  </Link>
                  <Link
                    href="/nfts"
                    className="text-white hover:text-cyan-200 font-semibold transition"
                  >
                    NFTs
                  </Link>
                  <Link
                    href="/staking"
                    className="text-white hover:text-cyan-200 font-semibold transition"
                  >
                    Staking
                  </Link>
                </>
              )}
              <Link
                href="/leaderboard"
                className="text-white hover:text-cyan-200 font-semibold transition"
              >
                Leaderboard
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-black rounded-lg hover:from-cyan-300 hover:to-purple-400 transition font-semibold"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/landing"
                className="text-white hover:text-cyan-200 font-semibold transition"
              >
                About
              </Link>
              <Link
                href="/leaderboard"
                className="text-white hover:text-cyan-200 font-semibold transition"
              >
                Leaderboard
              </Link>
              <button
                onClick={login}
                className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-black rounded-lg hover:from-cyan-300 hover:to-purple-400 transition font-semibold"
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
