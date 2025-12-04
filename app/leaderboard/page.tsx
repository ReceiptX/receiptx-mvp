import { supabaseService } from '@/lib/supabaseServiceClient';

type ReferrerRow = {
  referrer_email: string | null;
  referrer_telegram_id: string | null;
  referrer_wallet_address: string | null;
  total_referrals: number;
  rewarded_referrals: number;
  total_aia_earned: number;
};

const FALLBACK_WAITLIST_COUNT = 0;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const client = supabaseService;

  const [
    { data: referrerRows, error: referrerError },
    { count: waitlistCountRaw, error: waitlistError },
  ] = await Promise.all([
    client
      .from('v_top_referrers')
      .select('referrer_email, referrer_telegram_id, referrer_wallet_address, total_referrals, rewarded_referrals, total_aia_earned')
      .order('total_referrals', { ascending: false })
      .limit(100),
    client
      .from('waitlist')
      .select('*', { count: 'exact', head: true }),
  ]);

  if (referrerError) {
    console.error('leaderboard load failed', referrerError);
  }

  if (waitlistError && waitlistError.code !== 'PGRST116') {
    console.error('waitlist count load failed', waitlistError);
  }

  const rows: ReferrerRow[] = Array.isArray(referrerRows) ? referrerRows : [];
  const globalLB = rows.slice(0, 10);
  const telegramLB = rows.filter((row) => row.referrer_telegram_id).slice(0, 10);

  const waitlistCount = typeof waitlistCountRaw === 'number' ? waitlistCountRaw : FALLBACK_WAITLIST_COUNT;

  const formatIdentifier = (row: ReferrerRow) =>
    row.referrer_email || row.referrer_telegram_id || row.referrer_wallet_address || 'Unknown';

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
                key={`${formatIdentifier(row)}-${idx}`}
                className="flex items-center justify-between bg-[#232946] border border-cyan-700/30 rounded-xl px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">{idx + 1}</span>
                  <span className="text-sm text-slate-200">{formatIdentifier(row)}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Referrals</p>
                  <p className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">{row.total_referrals}</p>
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
                key={`${formatIdentifier(row)}-${idx}`}
                className="flex items-center justify-between bg-[#232946] border border-cyan-700/30 rounded-xl px-4 py-3 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">{idx + 1}</span>
                  <span className="text-sm text-slate-200">{formatIdentifier(row)}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Referrals</p>
                  <p className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow">{row.total_referrals}</p>
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
