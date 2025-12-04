import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = "nodejs";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server side only
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      referrerCode, // string – code belonging to the person who referred
      email,        // email of new user / waitlist
      source = 'web', // 'web' | 'telegram'
      telegramId    // optional: string
    } = body;

    if (!referrerCode || !email) {
      return NextResponse.json(
        { error: 'referrerCode and email are required' },
        { status: 400 }
      );
    }

    // 1) Ensure user exists or create
    let { data: existingUser, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (userErr) throw userErr;

    if (!existingUser) {
      const { data: newUser, error: insertUserErr } = await supabase
        .from('users')
        .insert({
          email,
          referred_by: referrerCode,
          is_telegram: source === 'telegram'
        })
        .select('*')
        .single();

      if (insertUserErr) throw insertUserErr;
      existingUser = newUser;
    }

    // 2) Track referral event
    const { error: refErr } = await supabase.from('referrals').insert({
      referrer_code: referrerCode,
      referred_user: existingUser.id,
      source
    });

    if (refErr) throw refErr;

    // 3) Add to waitlist if not already present
    await supabase.from('waitlist').upsert({ email });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Referral API error', err);
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 });
  }
}

