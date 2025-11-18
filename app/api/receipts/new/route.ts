import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { brand, amount, multiplier, location, telegram_id, wallet_address, metadata } = body

    // Validate required fields
    if (!brand || !amount || !telegram_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Insert receipt
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        brand,
        amount,
        multiplier,
        location,
        telegram_id,
        wallet_address,
        metadata
      })
      .select()

    if (error) {
      console.error("DB Insert Error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, receipt: data[0] })
  } catch (err: any) {
    console.error("Unexpected error:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Unknown server error" },
      { status: 500 }
    )
  }
}
