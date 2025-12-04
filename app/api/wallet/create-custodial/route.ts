import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { MultiTenantWalletGenerator } from '@/lib/multiTenantWalletGenerator';

// ReceiptX tenant configuration
export const runtime = "nodejs";
const RECEIPTX_TENANT_CONFIG = {
  tenant_id: process.env.RECEIPTX_TENANT_ID || "receiptx_main",
  tenant_salt: process.env.RECEIPTX_TENANT_SALT || process.env.WEB2WEB3_SECRET_KEY || "",
  tenant_pepper: process.env.RECEIPTX_TENANT_PEPPER || process.env.WEB2WEB3_PEPPER || "",
  wallet_policy: "custodial" as const
};

/**
 * POST /api/wallet/create-custodial
 * =================================
 * Generate and store custodial wallet for user using multi-tenant system
 */
export async function POST(req: NextRequest) {
  try {
    const { user_email, telegram_id } = await req.json();

    if (!user_email && !telegram_id) {
      return NextResponse.json(
        { error: 'Email or Telegram ID required' },
        { status: 400 }
      );
    }

    // Check if wallet already exists
    let query = supabase
      .from('user_wallets')
      .select('wallet_address')
      .eq('tenant_id', RECEIPTX_TENANT_CONFIG.tenant_id);
    
    if (user_email) query = query.eq('user_email', user_email);
    else if (telegram_id) query = query.eq('telegram_id', telegram_id);

    const { data: existing } = await query.single();

    if (existing) {
      return NextResponse.json(
        { 
          success: true,
          wallet_address: existing.wallet_address,
          message: 'Wallet already exists'
        },
        { status: 200 }
      );
    }

    // Validate tenant configuration
    if (!RECEIPTX_TENANT_CONFIG.tenant_salt || !RECEIPTX_TENANT_CONFIG.tenant_pepper) {
      return NextResponse.json(
        { error: 'Wallet generation not configured. Please set tenant secrets' },
        { status: 500 }
      );
    }

    // Generate wallet using multi-tenant system
    const generator = new MultiTenantWalletGenerator();
    const walletData = await generator.generateWalletForTenant({
      email: user_email,
      telegram_id: telegram_id,
      tenant_id: RECEIPTX_TENANT_CONFIG.tenant_id
    }, RECEIPTX_TENANT_CONFIG);

    // Wallet is already stored by multiTenantWalletGenerator.storeWalletSecurely()
    return NextResponse.json({
      success: true,
      wallet_address: walletData.address,
      tenant_id: walletData.tenant_id,
      message: 'Custodial wallet created successfully'
    });

  } catch (error) {
    console.error('Custodial wallet creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create custodial wallet' },
      { status: 500 }
    );
  }
}

