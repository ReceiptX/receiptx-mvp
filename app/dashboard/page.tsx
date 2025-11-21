"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import RiskDisclaimer from "../components/RiskDisclaimer";

interface ComprehensiveStats {
  total_receipts: number;
  total_rwt_earned: number;
  total_aia_earned: number;
  average_rwt_per_receipt: number;
  current_tier: string;
  staked_aia: number;
  active_nfts: number;
  referral_bonuses: number;
  risk_status: string;
}

interface NFT {
  id: string;
  nft_type: string;
  status: string;
  created_at: string;
  nft_catalog: {
    nft_name: string;
    description: string;
    aia_value: number;
    tier: string;
  };
}

interface Receipt {
  id: string;
  merchant_name: string;
  total_amount: number;
  receipt_date: string;
  rwt_earned: number;
  multiplier: number;
  created_at: string;
}

interface UserStats {
  rwtBalance: number;
  aiaBalance: number;
  comprehensiveStats: ComprehensiveStats | null;
  nfts: NFT[];
  recentReceipts: Receipt[];
  referralCode: string;
  referralLink: string;
}

export default function DashboardPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (authenticated && user) {
      fetchUserStats();
    }
  }, [authenticated, user]);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const email = user?.email?.address;
      const telegramId = (user as any)?.telegram?.userId;
      const walletAddress = user?.wallet?.address;

      const params = new URLSearchParams();
      if (email) params.set("user_email", email);
      if (telegramId) params.set("telegram_id", telegramId.toString());
      if (walletAddress) params.set("wallet_address", walletAddress);

      // Fetch all data in parallel
      const [balancesRes, comprehensiveRes, nftsRes, receiptsRes, referralCodeRes] = await Promise.all([
        fetch(`/api/rewards/balance?${params}`),
        fetch(`/api/stats/comprehensive?${params}`),
        fetch(`/api/nfts/list?${params}&status=active`),
        fetch(`/api/receipts/history?${params}&limit=5`),
        fetch(`/api/referrals/create?${params}`)
      ]);

      const [balances, comprehensive, nftsData, receiptsData, referralCode] = await Promise.all([
        balancesRes.json(),
        comprehensiveRes.json(),
        nftsRes.json(),
        receiptsRes.json(),
        referralCodeRes.json()
      ]);

      setStats({
        rwtBalance: balances.rwtBalance || 0,
        aiaBalance: balances.aiaBalance || 0,
        comprehensiveStats: comprehensive.success ? comprehensive.stats : null,
        nfts: nftsData.success ? nftsData.nfts : [],
        recentReceipts: receiptsData.success ? receiptsData.receipts : [],
        referralCode: referralCode.referral_code || "",
        referralLink: referralCode.referral_link || ""
      });
    } catch (err: any) {
      console.error("Error fetching stats:", err);
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 text-white p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button 
            onClick={fetchUserStats}
            className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-300">
              Welcome back, {user?.email?.address || (user as any)?.telegram?.username || "User"}!
            </p>
          </div>
          <button
            onClick={() => router.push("/receipts/scan")}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            Scan Receipt
          </button>
        </div>

        {/* Risk Disclaimer */}
        <RiskDisclaimer />

        {/* Token Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">RWT Balance</h2>
              <span className="text-3xl">🎁</span>
            </div>
            <p className="text-5xl font-bold text-green-400 mb-2">
              {stats?.rwtBalance.toLocaleString()}
            </p>
            <p className="text-gray-300">Reward Tokens</p>
            <button
              onClick={() => router.push('/rewards')}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              💰 Spend RWT
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">AIA Balance</h2>
              <span className="text-3xl">💎</span>
            </div>
            <p className="text-5xl font-bold text-blue-400 mb-2">
              {stats?.aiaBalance.toLocaleString()}
            </p>
            <p className="text-gray-300">Analytics Tokens</p>
          </div>
        </div>

        {/* Receipt Stats & Tier */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Total Receipts</h3>
            <p className="text-4xl font-bold text-purple-400">{stats?.comprehensiveStats?.total_receipts || 0}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Total RWT Earned</h3>
            <p className="text-4xl font-bold text-green-400">{(stats?.comprehensiveStats?.total_rwt_earned || 0).toLocaleString()}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Avg per Receipt</h3>
            <p className="text-4xl font-bold text-yellow-400">
              {Math.round(stats?.comprehensiveStats?.average_rwt_per_receipt || 0)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Current Tier</h3>
            <p className="text-4xl font-bold text-indigo-400">{stats?.comprehensiveStats?.current_tier || "Bronze"}</p>
            <button
              onClick={() => router.push("/staking")}
              className="mt-2 text-sm text-blue-300 hover:text-blue-200"
            >
              Manage Staking →
            </button>
          </div>
        </div>

        {/* NFT Showcase */}
        {stats && stats.nfts.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">My NFTs ({stats.nfts.length})</h2>
              <button
                onClick={() => router.push("/nfts")}
                className="text-blue-300 hover:text-blue-200"
              >
                View All →
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.nfts.slice(0, 3).map((nft) => (
                <div
                  key={nft.id}
                  className="bg-black/30 rounded-lg p-4 border border-white/10"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-white">{nft.nft_catalog.nft_name}</h3>
                    <span className="text-2xl">🎁</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{nft.nft_catalog.tier} Tier</p>
                  <p className="text-xl font-bold text-green-400">{nft.nft_catalog.aia_value} AIA</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Referral Section */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Referral Program</h2>
          
          {/* Referral Link */}
          <div className="bg-black/30 rounded-lg p-4 mb-6">
            <label htmlFor="referral-link" className="text-sm text-gray-300 mb-2 block">Your Referral Link</label>
            <div className="flex gap-2">
              <input
                id="referral-link"
                type="text"
                value={stats?.referralLink || ""}
                readOnly
                className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white"
              />
              <button
                onClick={copyReferralLink}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                {copied ? "Copied! ✓" : "Copy"}
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Share this link to earn 5 AIA per referral (10 AIA if they scan Starbucks, Circle K, or McDonald&apos;s)
            </p>
          </div>

          {/* Referral Stats */}
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-400">{stats?.comprehensiveStats?.referral_bonuses || 0}</p>
            <p className="text-sm text-gray-300">Total Referral Bonuses Earned</p>
          </div>
        </div>

        {/* Recent Receipts */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Receipts</h2>
          
          {stats?.recentReceipts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No receipts yet. Scan your first receipt to start earning rewards!
            </p>
          ) : (
            <div className="space-y-3">
              {stats?.recentReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="bg-black/30 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">
                      {receipt.merchant_name}
                      {receipt.multiplier > 1 && (
                        <span className="ml-2 text-xs bg-yellow-500 text-black px-2 py-1 rounded">
                          {receipt.multiplier}x
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-400">
                      ${receipt.total_amount.toFixed(2)} • {new Date(receipt.receipt_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">+{receipt.rwt_earned}</p>
                    <p className="text-sm text-gray-400">RWT</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {stats && stats.recentReceipts.length > 0 && (
            <button
              onClick={() => router.push("/receipts/history")}
              className="w-full mt-4 bg-white/5 hover:bg-white/10 text-white py-3 rounded-lg font-semibold transition"
            >
              View All Receipts
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
