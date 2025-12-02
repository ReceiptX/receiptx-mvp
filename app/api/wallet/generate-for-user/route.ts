import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServiceClient';
import { deriveWalletEntropy, createSupraKeypairFromEntropy } from '@/lib/crypto/walletDerivation';
import { encryptPrivateKey } from '@/lib/crypto/aesGcm';

export const runtime = 'nodejs';

/**
 * POST /api/wallet/generate-for-user
 * Manually generate wallet for existing user (admin/recovery endpoint)
 * Body: { user_id: string } or { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, email } = body;

    if (!user_id && !email) {
      return NextResponse.json(
        { success: false, error: 'user_id or email required' },
        { status: 400 }
      );
    }

    // Find user
    let userId = user_id;
    if (!userId && email) {
      const { data: user, error } = await supabaseService
        .from('users')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();

      if (error || !user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      userId = user.id;
    }

    // Check if wallet already exists
    const { data: existing } = await supabaseService
      .from('user_wallets')
      .select('wallet_address')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'Wallet already exists',
        wallet_address: existing.wallet_address,
      });
    }

    // Generate wallet
    console.log('Generating wallet for user_id:', userId);
    
    const entropy = deriveWalletEntropy(userId);
    const keypair = createSupraKeypairFromEntropy(entropy);

    console.log('Generated keypair:', {
      address: keypair.address,
      hasPrivateKey: !!keypair.privateKey,
    });

    // Encrypt private key
    const encrypted = encryptPrivateKey(keypair.privateKey);
    const encryptedPrivateKey = JSON.stringify(encrypted);

    // Get user email for redundancy
    const { data: userData } = await supabaseService
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    // Insert wallet (using only columns that exist in the current schema)
    const { data: wallet, error: walletError } = await supabaseService
      .from('user_wallets')
      .insert({
        user_id: userId,
        wallet_address: keypair.address,
        encrypted_private_key: encryptedPrivateKey,
        user_email: userData?.email || null,
      })
      .select('wallet_address')
      .single();

    if (walletError) {
      console.error('Wallet insert error:', walletError);
      return NextResponse.json(
        { success: false, error: walletError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet_address: wallet.wallet_address,
      message: 'Wallet created successfully',
    });
  } catch (err: any) {
    console.error('Generate wallet error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
