import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Optional wallet generation (only if proprietary module exists)
let SeamlessWalletGenerator: any = null;
try {
  SeamlessWalletGenerator = require('@/lib/seamlessWalletGenerator').SeamlessWalletGenerator;
} catch (e) {
  console.log("ℹ️ Seamless wallet generation disabled (module not found)");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, telegram_id, biometrics } = body;

    if (!email && !telegram_id) {
      return NextResponse.json(
        { success: false, error: 'Email or Telegram ID required' },
        { status: 400 }
      );
    }

    // Check if wallet already exists
    let existingWallet;
    if (email) {
      const { data } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_email', email)
        .single();
      existingWallet = data;
    } else if (telegram_id) {
      const { data } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('telegram_id', telegram_id)
        .single();
      existingWallet = data;
    }

    if (existingWallet) {
      return NextResponse.json({
        success: true,
        wallet: {
          address: existingWallet.wallet_address,
          exists: true
        }
      });
    }

    // Check if wallet generator is available
    if (!SeamlessWalletGenerator) {
      return NextResponse.json(
        { success: false, error: 'Wallet generation not available in this deployment' },
        { status: 503 }
      );
    }

    // Generate new wallet using proprietary tech
    const generator = new SeamlessWalletGenerator();
    const wallet = await generator.generateWalletSilently({
      email,
      telegram_id,
      biometrics
    });

    // Encrypt private key before storage
    const encryptedKey = await encryptPrivateKey(wallet.privateKey);

    // Store in Supabase
    const { data, error } = await supabase
      .from('user_wallets')
      .insert({
        user_email: email,
        telegram_id: telegram_id,
        wallet_address: wallet.address,
        encrypted_private_key: encryptedKey,
        derivation_path: 'm/44\'/60\'/0\'/0/0', // Standard Ethereum path
        metadata: {
          created_at: new Date().toISOString(),
          generator_version: '1.0.0'
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing wallet:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to store wallet' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      wallet: {
        address: wallet.address,
        exists: false
      }
    });

  } catch (err: any) {
    console.error('Wallet generation error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Wallet generation failed' },
      { status: 500 }
    );
  }
}

async function encryptPrivateKey(privateKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);
  const secretKey = process.env.WEB2WEB3_SECRET_KEY || 'default-secret-key';
  const keyData = encoder.encode(secretKey);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest('SHA-256', keyData),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return Buffer.from(combined).toString('base64');
}
