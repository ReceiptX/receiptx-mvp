import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
export { dynamic } from "@/lib/apiDynamic";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Reward ID is required" },
        { status: 400 }
      );
    }

    // Validate RWT cost if being updated
    if (updates.rwt_cost !== undefined && updates.rwt_cost <= 0) {
      return NextResponse.json(
        { success: false, error: "RWT cost must be greater than 0" },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;
    delete updates.claimed_count; // Managed by triggers

    const { data, error } = await supabase
      .from("business_rewards")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating reward:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: "Reward not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      reward: data,
      message: "Reward updated successfully",
    });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
