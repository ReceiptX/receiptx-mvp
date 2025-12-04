'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';

export type ReceiptStat = {
  brand: string;
  total_spent: number;
  avg_multiplier: number;
  receipt_count: number;
};

export type TopReferrer = {
  referrer_email: string | null;
  referrer_telegram_id: string | null;
  referrer_wallet_address: string | null;
  total_referrals: number;
  rewarded_referrals: number;
  total_aia_earned: number;
};

export type SignupSummary = {
  id: string;
  business_name: string;
  contact_email: string;
  status: string;
  integration_preference: string | null;
  created_at: string;
};

export type SignupCounts = {
  total: number;
  byStatus: Record<string, number>;
};

interface BusinessDashboardClientProps {
  stats: ReceiptStat[];
  topReferrers: TopReferrer[];
  signups: SignupSummary[];
  signupCounts: SignupCounts;
}

function formatStatusLabel(status: string) {
  const normalized = status.replace(/[-_]/g, ' ').toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function BusinessDashboardClient({ stats, topReferrers, signups, signupCounts }: BusinessDashboardClientProps) {
  const hasStats = stats.length > 0;
  const topBrands = useMemo(() => stats.slice(0, 8), [stats]);

  return (
    <main className="min-h-screen bg-[#0B0C10] text-white px-6 py-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold text-cyan-300 drop-shadow">Business Intelligence Dashboard</h1>
            <p className="mt-2 text-slate-300 max-w-2xl">
              Track how ReceiptX shoppers engage with your brand, monitor referral champions, and review inbound partnership requests in real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/business/signup"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-semibold text-black shadow-lg hover:brightness-105"
            >
              Invite a New Brand
            </Link>
            <Link
              href="/rewards"
              className="rounded-xl border border-cyan-400/40 px-5 py-3 text-sm font-semibold text-cyan-200 hover:border-cyan-200"
            >
              Explore Rewards Catalog
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6">
            <p className="text-xs uppercase tracking-wide text-cyan-200 mb-2">Total Signups</p>
            <p className="text-4xl font-extrabold text-white">{signupCounts.total}</p>
            <p className="mt-2 text-sm text-cyan-100">Businesses that have requested access</p>
          </div>
          {Object.entries(signupCounts.byStatus).map(([status, count]) => (
            <div key={status} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-wide text-slate-300 mb-2">{formatStatusLabel(status)}</p>
              <p className="text-3xl font-bold text-white">{count}</p>
            </div>
          ))}
        </section>

        <section className="bg-[#111827] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-white">Brand Performance</h2>
              <p className="text-sm text-slate-400">Receipt spend and multiplier utilization across the top brands.</p>
            </div>
            <span className="text-xs uppercase tracking-wide text-slate-500">Data refreshed on load</span>
          </div>

          {hasStats ? (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBrands}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="brand" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} />
                  <Bar dataKey="total_spent" name="Total Spend" fill="#22d3ee" radius={6} />
                  <Bar dataKey="avg_multiplier" name="Avg Multiplier" fill="#818cf8" radius={6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-600 p-10 text-center text-slate-400">
              No receipt analytics yet. Once shoppers submit receipts tied to your brand, insights will appear here automatically.
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Referral Leaders</h2>
              <span className="text-xs uppercase tracking-wide text-slate-400">Top 10</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="py-2 pr-3">Referrer</th>
                    <th className="py-2 pr-3 text-right">Referrals</th>
                    <th className="py-2 pr-3 text-right">Rewarded</th>
                    <th className="py-2 text-right">AIA Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {topReferrers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No referral activity yet. Encourage users to share their invite links.
                      </td>
                    </tr>
                  )}
                  {topReferrers.map((referrer) => {
                    const identifier = referrer.referrer_email || referrer.referrer_telegram_id || referrer.referrer_wallet_address || 'Unknown';
                    return (
                      <tr key={`${identifier}-${referrer.total_referrals}`} className="border-b border-white/5 last:border-0">
                        <td className="py-3 pr-3 text-slate-200">{identifier}</td>
                        <td className="py-3 pr-3 text-right text-white font-semibold">{referrer.total_referrals}</td>
                        <td className="py-3 pr-3 text-right text-slate-200">{referrer.rewarded_referrals}</td>
                        <td className="py-3 text-right text-emerald-300 font-semibold">{referrer.total_aia_earned}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Recent Business Signups</h2>
              <Link href="/business/signup" className="text-xs uppercase tracking-wide text-cyan-300 hover:text-cyan-100">
                Add New
              </Link>
            </div>
            <div className="space-y-4">
              {signups.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-600 p-6 text-center text-slate-400">
                  Once businesses request integrations, they will appear here with their status.
                </div>
              )}
              {signups.map((signup) => (
                <div key={signup.id} className="rounded-lg border border-white/10 bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">{signup.business_name}</p>
                      <p className="text-sm text-slate-400">{signup.contact_email}</p>
                      {signup.integration_preference && (
                        <p className="mt-1 text-xs text-slate-500">Prefers: {signup.integration_preference}</p>
                      )}
                    </div>
                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 border border-cyan-500/40">
                      {formatStatusLabel(signup.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500 uppercase tracking-wide">
                    Submitted {new Date(signup.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
