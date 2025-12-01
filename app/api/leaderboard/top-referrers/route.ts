import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServiceClient';

export const runtime = 'edge';

export async function GET() {
  const { data, error } = await supabaseService.from('v_top_referrers').select('*').limit(10);
  if (error) {
    console.error('Leaderboard error', error);
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
  }

  return NextResponse.json({ top: data ?? [] });
}

export default { GET };
