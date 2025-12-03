// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseClient";


const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export async function POST(request: NextRequest) {
  try {
    const { product_key, user_email, telegram_id, wallet_address } = await request.json();

    // Validate user identifier
    if (!user_email && !telegram_id && !wallet_address) {
      return NextResponse.json(
        { error: "User identifier required (email, telegram_id, or wallet)" },
        { status: 400 }
      );
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from("telegram_products")
      .select("*")
      .eq("product_key", product_key)
      .eq("active", true)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found or inactive" }, { status: 404 });
    }

    // Create invoice payload
    const payload = {
      product_key: product.product_key,
      user_email,
      telegram_id,
      wallet_address,
      timestamp: Date.now()
    };

    // Create Telegram invoice
    const invoiceData = {
      title: product.name,
      description: product.description || `Purchase ${product.name}`,
      payload: JSON.stringify(payload),
      provider_token: "", // Empty for Telegram Stars
      currency: "XTR", // Telegram Stars currency code
      prices: [
        {
          label: product.name,
          amount: product.price_stars
        }
      ]
    };

    return NextResponse.json({ 
      success: true,
      invoice: invoiceData, 
      product 
    });
  } catch (error: any) {
    console.error("Invoice creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
