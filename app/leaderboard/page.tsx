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
    <main className="min-h-screen bg-rxBg text-rxText flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-extrabold text-center mb-6 text-rxCyan drop-shadow-[0_0_20px_rgba(0,230,255,0.6)]">
          ReceiptX Referral Leaderboard
        </h1>

        {/* Live waitlist counter */}
        <div className="mb-10 flex flex-col items-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400">
            Live Waitlist Signups
          </p>
          <p className="text-5xl font-extrabold mt-2 text-rxAqua">
            {waitlistCount.toLocaleString()}
          </p>
        </div>

        {/* Global leaderboard */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-rxAqua">Global Top 10</h2>
            <span className="text-xs text-gray-400">
              Top 10 each earn <span className="text-rxMagenta font-semibold">5,000 AIA</span>
            </span>
          </div>

          <div className="space-y-2">
            {globalLB.map((row, idx) => (
              <div
                key={row.referrer_code + idx}
                className="flex items-center justify-between bg-[#151820] rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-rxCyan">
                    {idx + 1}
                  </span>
                  <span className="text-sm">
                    {row.users?.email || 'Unknown'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Referrals</p>
                  <p className="text-lg font-bold text-rxPurple">
                    {row.referral_count}
                  </p>
                </div>
              </div>
            ))}
            {globalLB.length === 0 && (
              <p className="text-center text-gray-500 text-sm">
                No referrals yet. Be the first to invite your friends!
              </p>
            )}
          </div>
        </section>

        {/* Telegram leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-rxMagenta">Telegram Top 10</h2>
            <span className="text-xs text-gray-400">
              Telegram-only leaderboard
            </span>
          </div>

          <div className="space-y-2">
            {telegramLB.map((row, idx) => (
              <div
                key={row.referrer_code + idx}
                className="flex items-center justify-between bg-[#151820] rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-rxPink">
                    {idx + 1}
                  </span>
                  <span className="text-sm">
                    {row.users?.email || 'Unknown'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Referrals</p>
                  <p className="text-lg font-bold text-rxPink">
                    {row.referral_count}
                  </p>
                </div>
              </div>
            ))}
            {telegramLB.length === 0 && (
              <p className="text-center text-gray-500 text-sm">
                No Telegram referrals yet. Share your link in the chat!
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
