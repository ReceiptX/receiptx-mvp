'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

type NavItem = { href: string; label: string; authOnly?: boolean };

const primaryLinks: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', authOnly: true },
  { href: '/receipts/scan', label: 'Receipts', authOnly: true },
  { href: '/rewards', label: 'Rewards', authOnly: true },
  { href: '/rewards/my-redemptions', label: 'My Redemptions', authOnly: true },
  { href: '/business/dashboard', label: 'Business', authOnly: true },
];

const guestLinks: NavItem[] = [
  { href: '/landing', label: 'About' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/business/signup', label: 'Business' },
];

export default function Navigation() {
  const { authenticated, login, logout } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  if (pathname.startsWith('/login')) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const renderLink = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={`font-semibold transition px-3 py-2 rounded-lg ${
        isActive(item.href)
          ? 'bg-white/15 text-cyan-200'
          : 'text-white hover:text-cyan-200 hover:bg-white/10'
      }`}
    >
      {item.label}
    </Link>
  );

  return (
    <nav className="sticky top-0 bg-gradient-to-r from-cyan-900 via-blue-900 to-purple-900/95 backdrop-blur border-b border-cyan-700/30 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/landing" className="text-white font-extrabold tracking-tight text-lg hover:text-cyan-200">
            ReceiptX
          </Link>

          {authenticated ? (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {primaryLinks.map(renderLink)}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-purple-500 text-black rounded-lg hover:from-cyan-300 hover:to-purple-400 transition font-semibold"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {guestLinks.map(renderLink)}
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
