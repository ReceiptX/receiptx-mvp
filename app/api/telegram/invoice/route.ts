import { NextResponse } from 'next/server';

// This should be replaced with your real Telegram bot token and provider token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PROVIDER_TOKEN = process.env.TELEGRAM_PROVIDER_TOKEN;

export async function POST(request: Request) {
  const { tier } = await request.json();
  if (!tier) {
    return NextResponse.json({ error: 'Missing NFT tier' }, { status: 400 });
  }

  // You should validate the tier and price here

  // Call Telegram Bot API to create invoice (server-side, not from frontend)
  // Example: https://core.telegram.org/bots/api#createinvoice
  // This is a placeholder. In production, use node-fetch or axios to call the Telegram API.

  // Example invoice payload (replace with real API call and response)
  const invoiceSlug = `receiptx_nft_${tier.name.replace(/\s+/g, '_').toLowerCase()}`;

  // Return the invoice slug or payload for the frontend to use
  return NextResponse.json({
    invoiceSlug,
    provider_token: PROVIDER_TOKEN,
    title: tier.name,
    description: `Purchase the ${tier.name} for ReceiptX.`,
    currency: 'USD',
    price: tier.price,
  });
}import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
