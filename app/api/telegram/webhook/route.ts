// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabaseClient";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Handle pre-checkout query (must respond within 10 seconds)
    if (update.pre_checkout_query) {
      const preCheckoutQuery = update.pre_checkout_query;
      
      try {
        // Validate the order
        const payload = JSON.parse(preCheckoutQuery.invoice_payload);
        
        // Answer pre-checkout query
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pre_checkout_query_id: preCheckoutQuery.id,
              ok: true
            })
          }
        );
      } catch (error) {
        console.error("Pre-checkout error:", error);
        // Reject the payment
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerPreCheckoutQuery`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pre_checkout_query_id: preCheckoutQuery.id,
              ok: false,
              error_message: "Unable to process payment. Please try again."
            })
          }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // Handle successful payment
    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const payload = JSON.parse(payment.invoice_payload);
      const { product_key, user_email, telegram_id, wallet_address } = payload;

      // Get product details
      const { data: product } = await supabase
        .from("telegram_products")
        .select("*")
        .eq("product_key", product_key)
        .single();

      if (product) {
        const benefits = product.benefits as any;

        // Apply benefits based on product type
        if (product.product_type === "subscription") {
          // Activate Premium tier by setting high staked AIA
          await supabase.from("user_tiers").upsert({
            user_email,
            telegram_id,
            wallet_address,
            current_tier: "Premium",
            staked_aia: 10000, // Simulate Premium tier
            premium_expires_at: new Date(Date.now() + product.duration_days * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: "user_email,telegram_id,wallet_address"
          });

          // Update user_stats
          await supabase.rpc("upsert_user_stats", {
            p_user_email: user_email,
            p_telegram_id: telegram_id,
            p_wallet_address: wallet_address
          });
        } else if (product.product_type === "consumable") {
          // Credit RWT tokens
          if (benefits.rwt) {
            const { data: existingRewards } = await supabase
              .from("user_rewards")
              .select("rwt_balance")
              .or(`user_email.eq.${user_email},telegram_id.eq.${telegram_id}`)
              .single();

            if (existingRewards) {
              await supabase
                .from("user_rewards")
                .update({
                  rwt_balance: existingRewards.rwt_balance + benefits.rwt,
                  updated_at: new Date().toISOString()
                })
                .or(`user_email.eq.${user_email},telegram_id.eq.${telegram_id}`);
            } else {
              await supabase.from("user_rewards").insert({
                user_email,
                telegram_id,
                wallet_address,
                rwt_balance: benefits.rwt,
                aia_balance: 0
              });
            }

            // Update user_stats
            const { data: stats } = await supabase
              .from("user_stats")
              .select("total_rwt_earned")
              .or(`user_email.eq.${user_email},telegram_id.eq.${telegram_id}`)
              .single();

            if (stats) {
              await supabase
                .from("user_stats")
                .update({
                  total_rwt_earned: stats.total_rwt_earned + benefits.rwt,
                  updated_at: new Date().toISOString()
                })
                .or(`user_email.eq.${user_email},telegram_id.eq.${telegram_id}`);
            }
          }

          // Activate time-limited boost
          if (benefits.multiplier && (benefits.duration_hours || benefits.uses)) {
            await supabase.from("user_boosts").insert({
              user_email,
              telegram_id,
              wallet_address,
              boost_type: benefits.uses ? "golden_receipt" : "multiplier",
              multiplier: benefits.multiplier,
              uses_remaining: benefits.uses || null,
              expires_at: benefits.duration_hours
                ? new Date(Date.now() + benefits.duration_hours * 60 * 60 * 1000).toISOString()
                : null,
              active: true,
              metadata: {
                product_key,
                payment_id: payment.telegram_payment_charge_id
              }
            });
          }
        } else if (product.product_type === "nft") {
          // Mint NFT instantly
          await supabase.from("user_nfts").insert({
            user_email,
            telegram_id,
            wallet_address,
            nft_type: benefits.nft_type,
            status: "active",
            metadata: {
              source: "telegram_stars_purchase",
              payment_id: payment.telegram_payment_charge_id
            }
          });
        }

        // Log transaction
        await supabase.from("telegram_transactions").insert({
          user_email,
          telegram_id,
          wallet_address,
          product_key,
          amount_stars: payment.total_amount,
          amount_usd: product.price_usd,
          payment_id: payment.telegram_payment_charge_id,
          status: "completed",
          completed_at: new Date().toISOString(),
          metadata: {
            currency: payment.currency,
            provider_payment_charge_id: payment.provider_payment_charge_id
          }
        });

        // Send confirmation message
        await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: update.message.chat.id,
              text: `🎉 *Purchase Successful!*\n\n${product.name} has been activated.\n\nThank you for supporting ReceiptX! 💚`,
              parse_mode: "Markdown"
            })
          }
        );
      }

      return NextResponse.json({ ok: true });
    }

    // Return OK for other update types
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
