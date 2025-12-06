"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import RiskDisclaimer from "../components/RiskDisclaimer";

interface TierBenefits {
  description?: string;
  [key: string]: unknown;
}

interface TierRequirement {
  tier: string;
  min_aia_staked: number;
  multiplier: number;
  benefits?: TierBenefits;
}

interface StakingInfo {
  staked_aia: number;
  current_tier: string;
  tier_requirements: TierRequirement[];
}

export default function StakingPage() {
  const router = useRouter();
  const { user, ready, authenticated } = usePrivy();
  
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [availableAIA, setAvailableAIA] = useState(0);
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  const fetchStakingInfo = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.email?.address) params.set("user_email", user.email.address);
      if (user?.wallet?.address) params.set("wallet_address", user.wallet.address);

      const res = await fetch(`/api/staking/stake?${params}`);
      const data = await res.json();

      if (data.success) {
        setStakingInfo(data);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load staking info.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchBalance = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (user?.email?.address) params.set("user_email", user.email.address);
      if (user?.wallet?.address) params.set("wallet_address", user.wallet.address);

      const res = await fetch(`/api/rewards/balance?${params}`);
      const data = await res.json();

      if (data.success) {
        setAvailableAIA(data.aiaBalance || 0);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to fetch balance:", message);
    }
  }, [user]);

  useEffect(() => {
    if (authenticated) {
      fetchStakingInfo();
      fetchBalance();
    }
  }, [authenticated, fetchBalance, fetchStakingInfo]);

  async function handleStake() {
    const amount = Number.parseInt(stakeAmount, 10);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > availableAIA) {
      alert("Insufficient AIA balance");
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch("/api/staking/stake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          user_email: user?.email?.address,
          wallet_address: user?.wallet?.address,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Successfully staked ${amount} AIA! New tier: ${data.new_tier}`);
        setStakeAmount("");
        await fetchStakingInfo();
        await fetchBalance();
      } else {
        alert(data.error || "Staking failed");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Staking failed";
      alert(message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleUnstake() {
    const amount = Number.parseInt(unstakeAmount, 10);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (amount > (stakingInfo?.staked_aia || 0)) {
      alert("Insufficient staked balance");
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch("/api/staking/unstake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          user_email: user?.email?.address,
          wallet_address: user?.wallet?.address,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Successfully unstaked ${amount} AIA! New tier: ${data.new_tier}`);
        setUnstakeAmount("");
        await fetchStakingInfo();
        await fetchBalance();
      } else {
        alert(data.error || "Unstaking failed");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unstaking failed";
      alert(message);
    } finally {
      setProcessing(false);
    }
  }

  function getTierColor(tier: string) {
    switch (tier.toLowerCase()) {
      case "bronze": return "from-orange-600 to-amber-700";
      case "silver": return "from-gray-400 to-gray-600";
      case "gold": return "from-yellow-400 to-yellow-600";
      case "premium": return "from-purple-500 to-pink-600";
      default: return "from-blue-500 to-indigo-600";
    }
  }

  function getNextTier() {
    if (!stakingInfo) return null;
    const currentTier = stakingInfo.current_tier.toLowerCase();
    const tiers = ["bronze", "silver", "gold", "premium"];
    const currentIndex = tiers.indexOf(currentTier);
    if (currentIndex === -1 || currentIndex === tiers.length - 1) return null;
    
    const nextTierName = tiers[currentIndex + 1];
    return stakingInfo.tier_requirements.find(t => t.tier.toLowerCase() === nextTierName);
  }

  if (!ready || !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  const nextTier = getNextTier();
  const currentStaked = stakingInfo?.staked_aia || 0;
  const nextTierRequired = nextTier ? nextTier.min_aia_staked - currentStaked : 0;
  const progressPercent = nextTier ? Math.min((currentStaked / nextTier.min_aia_staked) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#181A2A] to-[#232946] text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Risk Disclaimer */}
        <RiskDisclaimer />
        
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white drop-shadow mb-2">AIA Staking</h1>
            <p className="text-slate-300">Stake AIA tokens to unlock premium tier benefits.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 rounded-lg border border-white/20 bg-white/10 text-cyan-200 hover:bg-white/20 transition"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 px-6 py-4 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          </div>
        ) : (
          <>
            {/* Current Status Card */}
            <div className={`bg-gradient-to-br ${getTierColor(stakingInfo?.current_tier || "bronze")} border border-white/15 rounded-xl shadow-2xl p-8 text-white`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-white/80 text-sm mb-1">Current Tier</p>
                  <h2 className="text-5xl font-bold">{stakingInfo?.current_tier || "Bronze"}</h2>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-sm mb-1">Staked AIA</p>
                  <h3 className="text-4xl font-bold">{currentStaked.toLocaleString()}</h3>
                </div>
              </div>

              {nextTier && (
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-sm mb-2">Progress to {nextTier.tier}</p>
                  <div className="w-full bg-white/20 rounded-full h-3 mb-2 overflow-hidden">
                    <div
                      className="bg-white rounded-full h-3 transition-all"
                      style={{ width: `${progressPercent}%` }}
                      aria-label="Progress bar"
                    ></div>
                  </div>
                  <p className="text-sm text-white/90">
                    {nextTierRequired > 0
                      ? `Stake ${nextTierRequired.toLocaleString()} more AIA to unlock ${nextTier.tier}`
                      : `${nextTier.tier} tier unlocked!`}
                  </p>
                </div>
              )}
            </div>

            {/* Stake/Unstake Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Stake Card */}
              <div className="bg-white/5 border border-white/10 rounded-xl shadow-lg p-6">
                <h3 className="text-2xl font-semibold text-white mb-4">Stake AIA</h3>
                <p className="text-sm text-slate-300 mb-4">
                  Available: <span className="font-semibold text-cyan-300">{availableAIA.toLocaleString()} AIA</span>
                </p>
                
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="Amount to stake"
                  className="w-full px-4 py-3 rounded-lg mb-4 bg-[#101326] border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />

                <button
                  onClick={handleStake}
                  disabled={processing || !stakeAmount}
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-black font-semibold shadow-lg hover:brightness-110 transition disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : "Stake AIA"}
                </button>
              </div>

              {/* Unstake Card */}
              <div className="bg-white/5 border border-white/10 rounded-xl shadow-lg p-6">
                <h3 className="text-2xl font-semibold text-white mb-4">Unstake AIA</h3>
                <p className="text-sm text-slate-300 mb-4">
                  Staked: <span className="font-semibold text-emerald-300">{currentStaked.toLocaleString()} AIA</span>
                </p>
                
                <input
                  type="number"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  placeholder="Amount to unstake"
                  className="w-full px-4 py-3 rounded-lg mb-4 bg-[#101326] border border-white/10 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />

                <button
                  onClick={handleUnstake}
                  disabled={processing || !unstakeAmount}
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 text-white font-semibold shadow-lg hover:brightness-110 transition disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {processing ? "Processing..." : "Unstake AIA"}
                </button>
              </div>
            </div>

            {/* Tier Comparison Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-white/10 border-b border-white/10">
                <h3 className="text-xl font-semibold text-white">All Tier Benefits</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Required Stake
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Multiplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Benefits
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-white/10">
                    {stakingInfo?.tier_requirements.map((tier) => (
                      <tr
                        key={tier.tier}
                        className={
                          tier.tier.toLowerCase() === stakingInfo.current_tier.toLowerCase()
                            ? "bg-cyan-500/10"
                            : ""
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${getTierColor(tier.tier)}`}>
                            {tier.tier}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                          {tier.min_aia_staked.toLocaleString()} AIA
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200">
                          {tier.multiplier}x
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {tier.benefits?.description || "Standard benefits"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
