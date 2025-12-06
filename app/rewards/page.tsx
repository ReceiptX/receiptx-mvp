'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
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
            <p className="text-gray-300">No rewards found</p>
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
          <img src={reward.business_logo_url} alt={reward.business_name} className="w-10 h-10 rounded-full" />
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
