'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Image from 'next/image';
import Link from 'next/link';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Reward {
  id: string;
  business_name: string;
  business_logo_url?: string;
  title: string;
  description: string;
  rwt_cost: number;
  original_value?: number;
  terms?: string;
  redemption_instructions?: string;
  featured: boolean;
  available: boolean;
  stock_remaining?: number | null;
  expires_at?: string;
  reward_categories?: Category;
}

type LockedPreview = {
  id: string;
  title: string;
  description: string;
  milestone: string;
  reward: string;
  accent: string;
  icon: string;
};

const LOCKED_PREVIEWS: LockedPreview[] = [
  {
    id: 'receipt-streak',
    title: 'Receipt Warrior Drop',
    description: 'Collect brand-tagged receipts to unlock an exclusive Warrior NFT and lifetime multiplier boosts.',
    milestone: 'Log 10 qualifying receipts',
    reward: '+150 bonus RWT & Warrior NFT',
    accent: 'from-amber-500/80 via-orange-500/60 to-pink-500/70',
    icon: '⚔️',
  },
  {
    id: 'tier-boost',
    title: 'Tier Boost Bundle',
    description: 'Redeem a bundle that jumps you to the next staking tier without locking extra AIA.',
    milestone: 'Stake 1,000 AIA',
    reward: 'Instant Silver tier + 2x receipt multiplier for 7 days',
    accent: 'from-cyan-500/80 via-blue-500/70 to-purple-600/70',
    icon: '🚀',
  },
  {
    id: 'brand-credit',
    title: 'Featured Brand Credit',
    description: 'Use your RWT for a real-world discount with our launch partner storefronts.',
    milestone: 'Refer 3 friends who upload receipts',
    reward: '$25 partner credit',
    accent: 'from-emerald-500/80 via-teal-500/70 to-cyan-500/70',
    icon: '🎁',
  },
];

export default function RewardsMarketplace() {
  const { authenticated, user } = usePrivy();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [rwtBalance, setRwtBalance] = useState(0);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/rewards/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      const res = await fetch(`/api/rewards/catalog?${params}`);
      const data = await res.json();
      if (data.success) {
        setRewards(data.rewards);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory]);

  const fetchBalance = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.email?.address) params.append('user_email', user.email.address);
      else if (user?.telegram?.telegramUserId) params.append('telegram_id', user.telegram.telegramUserId);
      else if (user?.wallet?.address) params.append('wallet_address', user.wallet.address);

      const res = await fetch(`/api/rewards/balance?${params}`);
      const data = await res.json();
      if (data.success) {
        const rwt = data.balance?.rwt ?? data.rwtBalance ?? 0;
        setRwtBalance(rwt);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  useEffect(() => {
    if (authenticated && user) {
      fetchBalance();
    }
  }, [authenticated, fetchBalance, user]);

  async function handleRedeem(reward: Reward) {
    if (!authenticated) {
      alert('Please log in to redeem rewards');
      return;
    }

    if (rwtBalance < reward.rwt_cost) {
      alert(`Insufficient RWT. You need ${reward.rwt_cost} RWT but only have ${rwtBalance} RWT`);
      return;
    }

    if (!confirm(`Redeem "${reward.title}" for ${reward.rwt_cost} RWT?`)) {
      return;
    }

    setRedeeming(reward.id);

    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reward_id: reward.id,
          user_email: user?.email?.address,
          telegram_id: user?.telegram?.telegramUserId,
          wallet_address: user?.wallet?.address,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`✅ Success!\n\nYour redemption code: ${data.redemption.code}\n\nCheck "My Rewards" to view details.`);
        await Promise.all([fetchBalance(), fetchRewards()]);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Error: ${message}`);
    }

    setRedeeming(null);
  }

  const featuredRewards = rewards.filter(r => r.featured);
  const displayRewards = selectedCategory || searchQuery ? rewards : rewards.filter(r => !r.featured);

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto text-white">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Rewards Marketplace</h1>
            <p className="text-gray-300">Redeem your RWT tokens for exclusive rewards</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-300">Your Balance</div>
            <div className="text-3xl font-bold text-cyan-400">{rwtBalance.toLocaleString()} RWT</div>
            <Link href="/rewards/my-redemptions" className="text-sm text-cyan-300 hover:text-cyan-200">
              View My Rewards →
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search rewards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void fetchRewards();
              }
            }}
            className="w-full px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
              selectedCategory === null
                ? 'bg-cyan-400 text-black font-semibold'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            All Rewards
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-cyan-400 text-black font-semibold'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Featured Rewards */}
        {!selectedCategory && !searchQuery && featuredRewards.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4 text-white">⭐ Featured Rewards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  rwtBalance={rwtBalance}
                  redeeming={redeeming === reward.id}
                  onRedeem={() => handleRedeem(reward)}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Rewards */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-white">
            {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'All Rewards'}
          </h2>
          {loading ? (
            <p className="text-gray-300">Loading rewards...</p>
          ) : displayRewards.length === 0 ? (
            <EmptyRewardsState previews={LOCKED_PREVIEWS} isAuthenticated={authenticated} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  rwtBalance={rwtBalance}
                  redeeming={redeeming === reward.id}
                  onRedeem={() => handleRedeem(reward)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function RewardCard({
  reward,
  rwtBalance,
  redeeming,
  onRedeem,
}: {
  reward: Reward;
  rwtBalance: number;
  redeeming: boolean;
  onRedeem: () => void;
}) {
  const canAfford = rwtBalance >= reward.rwt_cost;
  const isAvailable = reward.available;

  return (
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:border-cyan-400/60 transition">
      {/* Business Logo/Name */}
      <div className="flex items-center gap-3 mb-3">
        {reward.business_logo_url ? (
          <Image
            src={reward.business_logo_url}
            alt={reward.business_name}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-cyan-400/20 flex items-center justify-center text-cyan-400 font-bold">
            {reward.business_name[0]}
          </div>
        )}
        <div>
          <div className="text-sm text-gray-300">{reward.business_name}</div>
          {reward.featured && <span className="text-xs text-yellow-300">⭐ Featured</span>}
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-xl font-semibold mb-2 text-white">{reward.title}</h3>
      <p className="text-gray-300 text-sm mb-4 line-clamp-2">{reward.description}</p>

      {/* Value & Cost */}
      <div className="flex justify-between items-center mb-4">
        {reward.original_value && (
          <div className="text-sm">
            <span className="text-gray-300">Value:</span>{' '}
            <span className="text-green-400 font-semibold">${reward.original_value}</span>
          </div>
        )}
        <div className="text-right">
          <div className="text-2xl font-bold text-cyan-400">{reward.rwt_cost} RWT</div>
        </div>
      </div>

      {/* Stock & Expiry */}
      <div className="flex justify-between text-xs text-gray-400 mb-4">
        {reward.stock_remaining !== null && (
          <span>{reward.stock_remaining} left</span>
        )}
        {reward.expires_at && (
          <span>Expires {new Date(reward.expires_at).toLocaleDateString()}</span>
        )}
      </div>

      {/* Redeem Button */}
      <button
        onClick={onRedeem}
        disabled={!isAvailable || !canAfford || redeeming}
        className={`w-full py-3 rounded-lg font-semibold transition ${
          !isAvailable
            ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
            : !canAfford
            ? 'bg-red-900/40 text-red-300 cursor-not-allowed'
            : redeeming
            ? 'bg-cyan-400/60 text-white cursor-wait'
            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
        }`}
      >
        {!isAvailable
          ? '❌ Out of Stock'
          : !canAfford
          ? '💰 Insufficient RWT'
          : redeeming
          ? '⏳ Redeeming...'
          : '✅ Redeem Now'}
      </button>
    </div>
  );
}

function EmptyRewardsState({ previews, isAuthenticated }: { previews: LockedPreview[]; isAuthenticated: boolean }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-10 text-white backdrop-blur">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] items-center">
        <div>
          <h3 className="text-3xl font-bold mb-3">Rewards vault is warming up</h3>
          <p className="text-gray-200 mb-6 max-w-xl">
            We are syncing launch partner perks right now. Keep scanning receipts and staking AIA so you are first in line when the vault opens.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/receipts/scan"
              className="px-5 py-3 rounded-lg bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 text-black font-semibold hover:brightness-110 transition"
            >
              Scan a receipt
            </Link>
            {!isAuthenticated && (
              <Link
                href="/landing"
                className="px-5 py-3 rounded-lg border border-white/30 text-white hover:bg-white/10 transition"
              >
                Create your wallet
              </Link>
            )}
          </div>
        </div>
        <div className="space-y-4">
          {previews.map((preview) => (
            <LockedRewardPreview key={preview.id} preview={preview} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LockedRewardPreview({ preview }: { preview: LockedPreview }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-6">
      <div className={`absolute inset-0 bg-gradient-to-r ${preview.accent} opacity-40`} aria-hidden="true" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 text-2xl">
          {preview.icon}
        </div>
        <div className="space-y-2">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">Locked Preview</p>
            <h4 className="text-xl font-semibold text-white">{preview.title}</h4>
          </div>
          <p className="text-sm text-gray-200/90">{preview.description}</p>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-black/50 px-3 py-1 text-cyan-200">{preview.milestone}</span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-white/90">{preview.reward}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
