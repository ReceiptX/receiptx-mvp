import { supabaseService } from '@/lib/supabaseServiceClient';
import {
  BusinessDashboardClient,
  ReceiptStat,
  SignupCounts,
  SignupSummary,
  TopReferrer,
} from './BusinessDashboardClient';

export const dynamic = 'force-dynamic';

const DEFAULT_STATUSES = ['new', 'contacted', 'in-progress', 'integrated', 'closed'];

export default async function BusinessDashboard() {
  const [brandAnalytics, topReferrersResponse, signupRowsResponse, statusRowsResponse] = await Promise.all([
    supabaseService.rpc('get_brand_analytics'),
    supabaseService
      .from('v_top_referrers')
      .select('referrer_email, referrer_telegram_id, referrer_wallet_address, total_referrals, rewarded_referrals, total_aia_earned')
      .limit(10),
    supabaseService
      .from('business_signups')
      .select('id, business_name, contact_email, status, integration_preference, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
    supabaseService.from('business_signups').select('status'),
  ]);

  const stats: ReceiptStat[] = Array.isArray(brandAnalytics.data) ? brandAnalytics.data : [];
  const topReferrers: TopReferrer[] = Array.isArray(topReferrersResponse.data) ? topReferrersResponse.data : [];
  const signups: SignupSummary[] = Array.isArray(signupRowsResponse.data) ? signupRowsResponse.data : [];

  const byStatus: Record<string, number> = {};
  DEFAULT_STATUSES.forEach((status) => {
    byStatus[status] = 0;
  });

  if (Array.isArray(statusRowsResponse.data)) {
    statusRowsResponse.data.forEach((row: { status: string | null }) => {
      const status = row.status || 'new';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });
  }

  const totalFromCounts = Object.values(byStatus).reduce((sum, value) => sum + value, 0);
  const totalFallback = signups.length;

  const signupCounts: SignupCounts = {
    total: totalFromCounts || totalFallback,
    byStatus,
  };

  return (
    <BusinessDashboardClient
      stats={stats}
      topReferrers={topReferrers}
      signups={signups}
      signupCounts={signupCounts}
    />
  );
}
