import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productType = searchParams.get("type");
    const activeOnly = searchParams.get("active") !== "false";

    let query = supabase
      .from("telegram_products")
      .select("*")
      .order("price_stars", { ascending: true });

    if (activeOnly) {
      query = query.eq("active", true);
    }

    if (productType) {
      query = query.eq("product_type", productType);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    return NextResponse.json({ products, count: products.length });
  } catch (error: any) {
    console.error("Products API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
