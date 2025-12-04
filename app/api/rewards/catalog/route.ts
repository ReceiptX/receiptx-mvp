import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Optional filters
    const category_id = searchParams.get("category_id");
    const featured = searchParams.get("featured");
    const search = searchParams.get("search");
    const min_cost = searchParams.get("min_cost");
    const max_cost = searchParams.get("max_cost");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("business_rewards")
      .select(`
        *,
        reward_categories (
          id,
          name,
          description,
          icon
        )
      `, { count: "exact" })
      .eq("is_active", true)
      .lte("starts_at", new Date().toISOString())
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("featured", { ascending: false })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (category_id) {
      query = query.eq("category_id", category_id);
    }

    if (featured === "true") {
      query = query.eq("featured", true);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,business_name.ilike.%${search}%`);
    }

    if (min_cost) {
      query = query.gte("rwt_cost", parseInt(min_cost));
    }

    if (max_cost) {
      query = query.lte("rwt_cost", parseInt(max_cost));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching catalog:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Check stock availability for each reward
    const availableRewards = data?.map((reward: any) => ({
      ...reward,
      available: reward.total_stock === null || reward.claimed_count < reward.total_stock,
      stock_remaining: reward.total_stock === null ? null : reward.total_stock - reward.claimed_count,
    }));

    return NextResponse.json({
      success: true,
      rewards: availableRewards,
      total: count,
      limit,
      offset,
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

