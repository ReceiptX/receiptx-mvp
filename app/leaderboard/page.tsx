"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  referrer_code: string;
  referral_count: number;
  users: { email: string | null } | null;
};

export default function LeaderboardPage() {
  const [globalLB, setGlobalLB] = useState<Row[]>([]);
  const [telegramLB, setTelegramLB] = useState<Row[]>([]);
  const [waitlistCount, setWaitlistCount] = useState<number>(0);

  async function fetchData() {
    // Global top 10
    const { data: global, error: globalErr } = await supabase
      .from('referrals')
      .select('referrer_code, referral_count:referrer_code, users!inner(email)')
      .order('referral_count', { ascending: false })
      .limit(10);

    if (!globalErr && global) setGlobalLB(global as any);

    // Telegram top 10 (join users where is_telegram = true)
    const { data: tele, error: teleErr } = await supabase
      .from('referrals')
      .select('referrer_code, referral_count:referrer_code, users!inner(email,is_telegram)')
      .eq('users.is_telegram', true)
      .order('referral_count', { ascending: false })
      .limit(10);

    if (!teleErr && tele) setTelegramLB(tele as any);

    // Waitlist live count
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    setWaitlistCount(count || 0);
  }

  useEffect(() => {
    fetchData();

    // Realtime: re-fetch whenever referrals change
    const channel = supabase
      .channel('referrals-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'referrals' },
        () => fetchData()
      )
      .subscribe();

    const waitlistChannel = supabase
      .channel('waitlist-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waitlist' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(waitlistChannel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B0C10] via-[#1F2235] to-[#232946] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-extrabold text-center mb-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">ReceiptX Referral Leaderboard</h1>

        {/* Live waitlist counter */}
        <div className="mb-10 flex flex-col items-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-300">Live Waitlist Signups</p>
          <p className="text-5xl font-extrabold mt-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">{waitlistCount.toLocaleString()}</p>
        </div>

        {/* Global leaderboard */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Global Top 10</h2>
            <span className="text-xs text-slate-300">Top 10 each earn <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent font-semibold">5,000 AIA</span></span>
          </div>

          <div className="space-y-2">
            {globalLB.map((row, idx) => (
              <div
                key={row.referrer_code + idx}
                className="flex items-center justify-between bg-[#232946] border border-cyan-700/30 rounded-xl px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">{idx + 1}</span>
                  <span className="text-sm text-slate-200">{row.users?.email || 'Unknown'}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Referrals</p>
                  <p className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">{row.referral_count}</p>
                </div>
              </div>
            ))}
            {globalLB.length === 0 && (
              <p className="text-center text-slate-400 text-sm">No referrals yet. Be the first to invite your friends!</p>
            )}
          </div>
        </section>

        {/* Telegram leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">Telegram Top 10</h2>
            <span className="text-xs text-slate-300">Telegram-only leaderboard</span>
          </div>

          <div className="space-y-2">
            {telegramLB.map((row, idx) => (
              <div
                key={row.referrer_code + idx}
                className="flex items-center justify-between bg-[#232946] border border-cyan-700/30 rounded-xl px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">{idx + 1}</span>
                  <span className="text-sm text-slate-200">{row.users?.email || 'Unknown'}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Referrals</p>
                  <p className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">{row.referral_count}</p>
                </div>
              </div>
            ))}
            {telegramLB.length === 0 && (
              <p className="text-center text-slate-400 text-sm">No Telegram referrals yet. Share your link in the chat!</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
