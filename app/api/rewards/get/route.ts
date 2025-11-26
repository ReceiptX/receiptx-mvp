import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseClient'

export async function POST(request: Request) {
  try {
    const { telegram_id } = await request.json()

    if (!telegram_id) {
      return NextResponse.json({ success: false, error: 'Missing telegram_id' })
    }

    // 🔹 Fetch all rewards for this user
    const { data, error } = await supabase
      .from('user_rewards')
      .select('brand, base_amount, multiplier, total_reward, created_at')
      .eq('telegram_id', telegram_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 🔹 Compute total balance
    const total = data.reduce((sum, r) => sum + Number(r.total_reward || 0), 0)

    return NextResponse.json({
      success: true,
      total_reward_balance: total,
      rewards: data,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message })
  }
}
