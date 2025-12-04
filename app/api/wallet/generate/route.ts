import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServiceClient';
import { deriveWalletEntropy, createSupraKeypairFromEntropy } from '@/lib/crypto/walletDerivation';
import { encryptPrivateKey } from '@/lib/crypto/aesGcm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, telegram_id } = body;

    if (!email && !telegram_id) {
      return NextResponse.json(
        { success: false, error: 'Email or Telegram ID required' },
        { status: 400 }
      );
    }

    // 1. Find or create user by email or telegram_id
    let userId: string;
    
    if (email) {
      const { data: existingUser } = await supabaseService
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error: userError } = await supabaseService
          .from('users')
          .insert({ email })
          .select('id')
          .single();

        if (userError || !newUser) {
          return NextResponse.json(
            { success: false, error: 'Failed to create user' },
            { status: 500 }
          );
        }
        userId = newUser.id;
      }
    } else {
      // Telegram ID flow
      const { data: existingUser } = await supabaseService
        .from('users')
        .select('id')
        .eq('telegram_id', telegram_id)
        .maybeSingle();

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error: userError } = await supabaseService
          .from('users')
          .insert({ telegram_id, is_telegram: true })
          .select('id')
          .single();

        if (userError || !newUser) {
          return NextResponse.json(
            { success: false, error: 'Failed to create user' },
            { status: 500 }
          );
        }
        userId = newUser.id;
      }
    }

    // 2. Check if wallet already exists for this user_id
    const { data: existingWallet } = await supabaseService
      .from('user_wallets')
      .select('wallet_address')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingWallet) {
      return NextResponse.json({
        success: true,
        wallet: {
          address: existingWallet.wallet_address,
          exists: true
        }
      });
    }

    // 3. Generate deterministic wallet from user_id
    const entropy = deriveWalletEntropy(userId);
    const keypair = createSupraKeypairFromEntropy(entropy);

    // 4. Encrypt private key using AES-256-GCM with RECEIPTX_WALLET_ENC_KEY
    const encrypted = encryptPrivateKey(keypair.privateKey);
    const encryptedPrivateKey = JSON.stringify(encrypted);

    // 5. Store wallet keyed by user_id
    const { error: walletError } = await supabaseService
      .from('user_wallets')
      .insert({
        user_id: userId,
        wallet_address: keypair.address,
        encrypted_private_key: encryptedPrivateKey,
        encryption_method: 'AES-256-GCM',
        blockchain_network: 'supra_testnet',
        user_email: email || null,
        telegram_id: telegram_id || null,
      });

    if (walletError) {
      console.error('Error storing wallet:', walletError);
      return NextResponse.json(
        { success: false, error: 'Failed to store wallet' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet: {
        address: keypair.address,
        exists: false
      }
    });

  } catch (err: any) {
    console.error('Wallet generation error:', err);
    return NextResponse.json(
      { success: false, error: 'Wallet generation failed' },
      { status: 500 }
    );
  }
}


