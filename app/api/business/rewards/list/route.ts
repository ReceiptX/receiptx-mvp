import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Optional filters
    const business_name = searchParams.get("business_name");
    const is_active = searchParams.get("is_active");
    const category_id = searchParams.get("category_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("business_rewards")
      .select(`
        *,
        reward_categories (
          id,
          name,
          icon
        )
      `, { count: "exact" })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (business_name) {
      query = query.eq("business_name", business_name);
    }

    if (is_active !== null) {
      query = query.eq("is_active", is_active === "true");
    }

    if (category_id) {
      query = query.eq("category_id", category_id);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching rewards:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rewards: data,
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

