'use client';

import { useEffect, useState } from 'react';
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
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchRewards();
    if (authenticated && user) {
      fetchBalance();
    }
  }, [authenticated, user, selectedCategory]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/rewards/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }

  async function fetchRewards() {
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
    }
    setLoading(false);
  }

  async function fetchBalance() {
    try {
      const identifier = user?.email?.address || user?.telegram?.telegramUserId || user?.wallet?.address;
      const params = new URLSearchParams();
      if (user?.email?.address) params.append('user_email', user.email.address);
      else if (user?.telegram?.telegramUserId) params.append('telegram_id', user.telegram.telegramUserId);
      else if (user?.wallet?.address) params.append('wallet_address', user.wallet.address);

      const res = await fetch(`/api/rewards/balance?${params}`);
      const data = await res.json();
      if (data.success) {
        setRwtBalance(data.balance.rwt || 0);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  }

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
        fetchBalance();
        fetchRewards();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    }

    setRedeeming(null);
  }

  const featuredRewards = rewards.filter(r => r.featured);
  const displayRewards = selectedCategory || searchQuery ? rewards : rewards.filter(r => !r.featured);

  return (
    <main className="min-h-screen bg-[#0B0C10] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-cyan-400 mb-2">Rewards Marketplace</h1>
            <p className="text-gray-400">Redeem your RWT tokens for exclusive rewards</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Your Balance</div>
            <div className="text-3xl font-bold text-cyan-400">{rwtBalance.toLocaleString()} RWT</div>
            <Link href="/rewards/my-redemptions" className="text-sm text-cyan-400 hover:underline">
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
            onKeyDown={(e) => e.key === 'Enter' && fetchRewards()}
            className="w-full px-6 py-3 bg-[#1F2833] border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => { setSelectedCategory(null); fetchRewards(); }}
            className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
              selectedCategory === null
                ? 'bg-cyan-400 text-black font-semibold'
                : 'bg-[#1F2833] text-gray-400 hover:bg-[#2A3441]'
            }`}
          >
            All Rewards
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); fetchRewards(); }}
              className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-cyan-400 text-black font-semibold'
                  : 'bg-[#1F2833] text-gray-400 hover:bg-[#2A3441]'
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>

        {/* Featured Rewards */}
        {!selectedCategory && !searchQuery && featuredRewards.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">⭐ Featured Rewards</h2>
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
          <h2 className="text-2xl font-bold mb-4">
            {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'All Rewards'}
          </h2>
          {loading ? (
            <p className="text-gray-400">Loading rewards...</p>
          ) : displayRewards.length === 0 ? (
            <p className="text-gray-400">No rewards found</p>
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
    <div className="bg-[#1F2833] rounded-2xl p-6 border border-cyan-400/20 hover:border-cyan-400/50 transition">
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
          <div className="text-sm text-gray-400">{reward.business_name}</div>
          {reward.featured && <span className="text-xs text-yellow-400">⭐ Featured</span>}
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-xl font-semibold mb-2">{reward.title}</h3>
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{reward.description}</p>

      {/* Value & Cost */}
      <div className="flex justify-between items-center mb-4">
        {reward.original_value && (
          <div className="text-sm">
            <span className="text-gray-400">Value:</span>{' '}
            <span className="text-green-400 font-semibold">${reward.original_value}</span>
          </div>
        )}
        <div className="text-right">
          <div className="text-2xl font-bold text-cyan-400">{reward.rwt_cost} RWT</div>
        </div>
      </div>

      {/* Stock & Expiry */}
      <div className="flex justify-between text-xs text-gray-500 mb-4">
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
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : !canAfford
            ? 'bg-red-900/30 text-red-400 cursor-not-allowed'
            : redeeming
            ? 'bg-cyan-400/50 text-white cursor-wait'
            : 'bg-cyan-400 text-black hover:bg-cyan-300'
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
