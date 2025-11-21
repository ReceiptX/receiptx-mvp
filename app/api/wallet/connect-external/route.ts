import { NextRequest, NextResponse } from "next/server";
import { SupraWalletIntegration } from "@/lib/supraWalletIntegration";

export const runtime = "nodejs";

/**
 * Connect external wallet (StarKey, MetaMask) to user account
 * POST /api/wallet/connect-external
 * Body: { wallet_type, address, user_email?, telegram_id? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { wallet_type, address, user_email, telegram_id } = body;

    // Validate required fields
    if (!wallet_type || !address) {
      return NextResponse.json(
        { success: false, error: "wallet_type and address are required" },
        { status: 400 }
      );
    }

    // Validate wallet type
    const validWalletTypes = ['starkey', 'metamask', 'privy', 'email_deterministic'];
    if (!validWalletTypes.includes(wallet_type)) {
      return NextResponse.json(
        { success: false, error: `Invalid wallet_type. Must be one of: ${validWalletTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { success: false, error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    // Store wallet connection
    const connection = {
      success: true,
      wallet_type: wallet_type as 'starkey' | 'metamask' | 'privy' | 'email_deterministic',
      address: address,
      onboarding_time_ms: 0
    };

    await SupraWalletIntegration.storeWalletConnection(
      connection,
      user_email,
      telegram_id
    );

    return NextResponse.json({
      success: true,
      message: "Wallet connected successfully",
      wallet: {
        type: wallet_type,
        address: address
      }
    });

  } catch (error) {
    console.error("Wallet connection error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to connect wallet" 
      },
      { status: 500 }
    );
  }
}

/**
 * Get user's connected wallet
 * GET /api/wallet/connect-external?user_email=xxx or ?telegram_id=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const user_email = searchParams.get('user_email');
    const telegram_id = searchParams.get('telegram_id');

    if (!user_email && !telegram_id) {
      return NextResponse.json(
        { success: false, error: "user_email or telegram_id required" },
        { status: 400 }
      );
    }

    const walletInfo = await SupraWalletIntegration.getUserWallet(
      user_email || undefined,
      telegram_id || undefined
    );

    return NextResponse.json({
      success: true,
      ...walletInfo
    });

  } catch (error) {
    console.error("Get wallet error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to get wallet" 
      },
      { status: 500 }
    );
  }
}
