import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // User identifiers
    const user_email = searchParams.get("user_email");
    const telegram_id = searchParams.get("telegram_id");
    const wallet_address = searchParams.get("wallet_address");

    // Validate user identifier
    if (!user_email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { success: false, error: "User identifier required" },
        { status: 400 }
      );
    }

    // Optional filters
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("user_redemptions")
      .select(`
        *,
        business_rewards (
          id,
          business_name,
          business_logo_url,
          title,
          description,
          original_value,
          terms,
          redemption_instructions,
          category_id,
          reward_categories (
            name,
            icon
          )
        )
      `, { count: "exact" })
      .order("claimed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply user filter
    if (user_email) {
      query = query.eq("user_email", user_email);
    } else if (telegram_id) {
      query = query.eq("telegram_id", telegram_id);
    } else if (wallet_address) {
      query = query.eq("wallet_address", wallet_address);
    }

    // Apply status filter
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching redemptions:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calculate totals
    const totalSpent = data?.reduce((sum: number, r: any) => sum + (r.rwt_spent || 0), 0) || 0;
    const activeCoupons = data?.filter((r: any) => r.status === "claimed").length || 0;
    const usedCoupons = data?.filter((r: any) => r.status === "used").length || 0;

    return NextResponse.json({
      success: true,
      redemptions: data,
      total: count,
      limit,
      offset,
      summary: {
        total_spent: totalSpent,
        active_coupons: activeCoupons,
        used_coupons: usedCoupons,
      },
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
