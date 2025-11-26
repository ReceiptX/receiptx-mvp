'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

interface Redemption {
  id: string;
  redemption_code: string;
  rwt_spent: number;
  status: 'claimed' | 'used' | 'expired' | 'cancelled';
  claimed_at: string;
  used_at?: string;
  expires_at?: string;
  business_rewards: {
    business_name: string;
    business_logo_url?: string;
    title: string;
    description: string;
    original_value?: number;
    terms?: string;
    redemption_instructions?: string;
    reward_categories?: {
      name: string;
      icon: string;
    };
  };
}

export default function MyRedemptions() {
  const { authenticated, user } = usePrivy();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState({ total_spent: 0, active_coupons: 0, used_coupons: 0 });

  useEffect(() => {
    if (authenticated && user) {
      fetchRedemptions();
    }
  }, [authenticated, user, selectedStatus]);

  async function fetchRedemptions() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (user?.email?.address) params.append('user_email', user.email.address);
      else if (user?.telegram?.telegramUserId) params.append('telegram_id', user.telegram.telegramUserId);
      else if (user?.wallet?.address) params.append('wallet_address', user.wallet.address);
      
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await fetch(`/api/rewards/my-redemptions?${params}`);
      const data = await res.json();

      if (data.success) {
        setRedemptions(data.redemptions);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching redemptions:', error);
    }
    setLoading(false);
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-rxBg text-rxText flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Please Log In</h1>
          <p className="text-gray-400">You need to be logged in to view your rewards</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-rxBg text-rxText p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-cyan-400 mb-2">My Rewards</h1>
            <p className="text-gray-400">View and manage your redeemed rewards</p>
          </div>
          <Link
            href="/rewards"
            className="px-6 py-3 bg-cyan-400 text-black rounded-lg font-semibold hover:bg-cyan-300 transition"
          >
            ← Back to Marketplace
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-rxCard rounded-xl p-6 border border-rxBlue/20">
            <div className="text-sm text-gray-400 mb-2">Total RWT Spent</div>
            <div className="text-3xl font-bold text-cyan-400">{summary.total_spent.toLocaleString()}</div>
          </div>
          <div className="bg-rxCard rounded-xl p-6 border border-green-400/20">
            <div className="text-sm text-gray-400 mb-2">Active Coupons</div>
            <div className="text-3xl font-bold text-green-400">{summary.active_coupons}</div>
          </div>
          <div className="bg-rxCard rounded-xl p-6 border border-purple-400/20">
            <div className="text-sm text-gray-400 mb-2">Used Coupons</div>
            <div className="text-3xl font-bold text-purple-400">{summary.used_coupons}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedStatus(null)}
            className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
              selectedStatus === null
                ? 'bg-cyan-400 text-black font-semibold'
                : 'bg-rxCard text-gray-400 hover:bg-rxPurple/30'
            }`}
          >
            All ({redemptions.length})
          </button>
          <button
            onClick={() => setSelectedStatus('claimed')}
            className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
              selectedStatus === 'claimed'
                ? 'bg-green-400 text-black font-semibold'
                : 'bg-[#1F2833] text-gray-400 hover:bg-[#2A3441]'
            }`}
          >
            ✅ Active
          </button>
          <button
            onClick={() => setSelectedStatus('used')}
            className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
              selectedStatus === 'used'
                ? 'bg-purple-400 text-black font-semibold'
                : 'bg-[#1F2833] text-gray-400 hover:bg-[#2A3441]'
            }`}
          >
            🎉 Used
          </button>
          <button
            onClick={() => setSelectedStatus('expired')}
            className={`px-6 py-2 rounded-full whitespace-nowrap transition ${
              selectedStatus === 'expired'
                ? 'bg-red-400 text-black font-semibold'
                : 'bg-[#1F2833] text-gray-400 hover:bg-[#2A3441]'
            }`}
          >
            ⏰ Expired
          </button>
        </div>

        {/* Redemptions List */}
        {loading ? (
          <p className="text-gray-400">Loading your rewards...</p>
        ) : redemptions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No rewards found</p>
            <Link href="/rewards" className="text-cyan-400 hover:underline">
              Browse rewards marketplace →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {redemptions.map((redemption) => (
              <RedemptionCard key={redemption.id} redemption={redemption} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function RedemptionCard({ redemption }: { redemption: Redemption }) {
  const [showDetails, setShowDetails] = useState(false);
  const reward = redemption.business_rewards;

  const getStatusBadge = () => {
    switch (redemption.status) {
      case 'claimed':
        return <span className="px-3 py-1 bg-green-400/20 text-green-400 rounded-full text-sm font-semibold">✅ Active</span>;
      case 'used':
        return <span className="px-3 py-1 bg-purple-400/20 text-purple-400 rounded-full text-sm font-semibold">🎉 Used</span>;
      case 'expired':
        return <span className="px-3 py-1 bg-red-400/20 text-red-400 rounded-full text-sm font-semibold">⏰ Expired</span>;
      case 'cancelled':
        return <span className="px-3 py-1 bg-gray-400/20 text-gray-400 rounded-full text-sm font-semibold">❌ Cancelled</span>;
    }
  };

  return (
    <div className="bg-rxCard rounded-xl p-6 border border-rxBlue/20 hover:border-rxBlue/40 transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Business Logo */}
          {reward.business_logo_url ? (
            <img src={reward.business_logo_url} alt={reward.business_name} className="w-16 h-16 rounded-lg" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-cyan-400/20 flex items-center justify-center text-cyan-400 text-2xl font-bold">
              {reward.business_name[0]}
            </div>
          )}

          {/* Reward Info */}
          <div className="flex-1">
            <div className="text-sm text-gray-400 mb-1">{reward.business_name}</div>
            <h3 className="text-xl font-semibold mb-2">{reward.title}</h3>
            <p className="text-gray-400 text-sm">{reward.description}</p>
          </div>
        </div>

        {/* Status & Cost */}
        <div className="text-right">
          {getStatusBadge()}
          <div className="mt-2 text-sm text-gray-400">
            Cost: <span className="text-cyan-400 font-semibold">{redemption.rwt_spent} RWT</span>
          </div>
          {reward.original_value && (
            <div className="text-sm text-green-400">Value: ${reward.original_value}</div>
          )}
        </div>
      </div>

      {/* Redemption Code */}
      <div className="bg-rxBg rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-400 mb-2">Redemption Code</div>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-mono font-bold text-cyan-400 tracking-wider">
            {redemption.redemption_code}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(redemption.redemption_code);
              alert('Code copied to clipboard!');
            }}
            className="px-4 py-2 bg-cyan-400/20 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition text-sm"
          >
            📋 Copy
          </button>
        </div>
      </div>

      {/* Dates */}
      <div className="flex gap-6 text-sm text-gray-400 mb-4">
        <div>
          <span className="font-semibold">Claimed:</span> {new Date(redemption.claimed_at).toLocaleString()}
        </div>
        {redemption.expires_at && (
          <div>
            <span className="font-semibold">Expires:</span> {new Date(redemption.expires_at).toLocaleString()}
          </div>
        )}
        {redemption.used_at && (
          <div>
            <span className="font-semibold">Used:</span> {new Date(redemption.used_at).toLocaleString()}
          </div>
        )}
      </div>

      {/* Show Details Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-cyan-400 hover:underline text-sm"
      >
        {showDetails ? '▼ Hide' : '▶'} Redemption Instructions & Terms
      </button>

      {/* Expandable Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-cyan-400/20">
          {reward.redemption_instructions && (
            <div className="mb-4">
              <h4 className="font-semibold text-cyan-400 mb-2">📝 How to Redeem:</h4>
              <p className="text-gray-300 text-sm">{reward.redemption_instructions}</p>
            </div>
          )}
          {reward.terms && (
            <div>
              <h4 className="font-semibold text-cyan-400 mb-2">📜 Terms & Conditions:</h4>
              <p className="text-gray-400 text-xs">{reward.terms}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
