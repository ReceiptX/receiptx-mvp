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
          <Link href="/" className="flex items-center gap-2" aria-label="Home">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.5 13.5V5.41a1 1 0 0 0-.3-.7L9.8.29A1 1 0 0 0 9.08 0H1.5v13.5A2.5 2.5 0 0 0 4 16h8a2.5 2.5 0 0 0 2.5-2.5m-1.5 0v-7H8v-5H3v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1M9.5 5V2.12L12.38 5zM5.13 5h-.62v1.25h2.12V5zm-.62 3h7.12v1.25H4.5zm.62 3h-.62v1.25h7.12V11z"
                clipRule="evenodd"
                fill="url(#logo-gradient)"
                fillRule="evenodd"
              />
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#06b6d4" />
                  <stop offset="1" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </svg>
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
