import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BUSINESS_SESSION_COOKIE, verifyBusinessSession } from '@/lib/businessPortalAuth';
import { supabaseService } from '@/lib/supabaseServiceClient';
import {
  BusinessDashboardClient,
  ReceiptStat,
  SignupCounts,
  SignupSummary,
  TopReferrer,
  ApiUsageSummary,
} from './BusinessDashboardClient';

export const dynamic = 'force-dynamic';

const DEFAULT_STATUSES = ['new', 'contacted', 'in-progress', 'integrated', 'closed'];

export default async function BusinessDashboard() {
  const cookieValue = (await cookies()).get(BUSINESS_SESSION_COOKIE)?.value || null;
  const session = verifyBusinessSession(cookieValue);
  if (!session.valid) {
    redirect('/business/login');
  }

  const [
    brandAnalytics,
    topReferrersResponse,
    signupRowsResponse,
    statusRowsResponse,
    apiEventResponse,
    platformAggResponse,
  ] = await Promise.all([
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
    supabaseService
      .from('business_api_events')
      .select('id, business_name, platform, total_amount, currency, status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(25),
    supabaseService.from('v_business_api_platforms').select('platform, event_count, total_amount'),
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

  const apiEvents = Array.isArray(apiEventResponse.data) ? apiEventResponse.data : [];
  const totalEvents = typeof apiEventResponse.count === 'number' ? apiEventResponse.count : apiEvents.length;
  const uniqueBusinesses = new Set(apiEvents.map((evt: any) => evt.business_name).filter(Boolean)).size;
  const totalAmount = apiEvents.reduce((sum: number, evt: any) => sum + Number(evt.total_amount || 0), 0);

  const platformBreakdown =
    Array.isArray(platformAggResponse.data) && platformAggResponse.data.length > 0
      ? platformAggResponse.data.map((row: any) => ({
          platform: row.platform,
          event_count: row.event_count,
          total_amount: row.total_amount,
        }))
      : Object.values(
          apiEvents.reduce((acc: any, evt: any) => {
            const platform = evt.platform || 'unknown';
            if (!acc[platform]) acc[platform] = { platform, event_count: 0, total_amount: 0 };
            acc[platform].event_count += 1;
            acc[platform].total_amount += Number(evt.total_amount || 0);
            return acc;
          }, {} as Record<string, { platform: string; event_count: number; total_amount: number }>)
        );

  const apiUsage: ApiUsageSummary = {
    totalEvents,
    totalAmount,
    uniqueBusinesses,
    lastEventAt: apiEvents[0]?.created_at || null,
    platformBreakdown,
    recentEvents: apiEvents,
  };

  return (
    <BusinessDashboardClient
      stats={stats}
      topReferrers={topReferrers}
      signups={signups}
      signupCounts={signupCounts}
      apiUsage={apiUsage}
    />
  );
}
