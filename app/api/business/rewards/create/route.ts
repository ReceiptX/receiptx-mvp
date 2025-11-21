import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const {
      business_name,
      business_email,
      title,
      description,
      category_id,
      rwt_cost,
      original_value,
      terms,
      redemption_instructions,
      total_stock,
      max_per_user = 1,
      starts_at,
      expires_at,
      tags,
      featured = false,
      priority = 0,
      created_by,
    } = body;

    if (!business_name || !title || !description || !rwt_cost) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (rwt_cost <= 0) {
      return NextResponse.json(
        { success: false, error: "RWT cost must be greater than 0" },
        { status: 400 }
      );
    }

    // Insert new reward
    const { data, error } = await supabase
      .from("business_rewards")
      .insert({
        business_name,
        business_email,
        title,
        description,
        category_id,
        rwt_cost,
        original_value,
        terms,
        redemption_instructions,
        total_stock,
        max_per_user,
        starts_at: starts_at || new Date().toISOString(),
        expires_at,
        tags,
        featured,
        priority,
        created_by,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating reward:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reward: data,
      message: "Reward created successfully",
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
