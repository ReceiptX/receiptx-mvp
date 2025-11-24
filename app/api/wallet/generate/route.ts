import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { MultiTenantWalletGenerator } from '@/lib/multiTenantWalletGenerator';

// ReceiptX tenant configuration
const RECEIPTX_TENANT_CONFIG = {
  tenant_id: process.env.RECEIPTX_TENANT_ID || "receiptx_main",
  tenant_salt: process.env.RECEIPTX_TENANT_SALT || process.env.WEB2WEB3_SECRET_KEY || "",
  tenant_pepper: process.env.RECEIPTX_TENANT_PEPPER || process.env.WEB2WEB3_PEPPER || "",
  wallet_policy: "custodial" as const
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, telegram_id, biometrics, password, twofa } = body;

    if (!email && !telegram_id) {
      return NextResponse.json(
        { success: false, error: 'Email or Telegram ID required' },
        { status: 400 }
      );
    }
    // Require password or 2FA for wallet generation
    if (!password && !twofa) {
      return NextResponse.json(
        { success: false, error: 'Password or 2FA code required' },
        { status: 400 }
      );
    }

    // Check if wallet already exists (only select wallet_address)
    let existingWalletAddress: string | null = null;
    if (email) {
      const { data } = await supabase
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_email', email)
        .single();
      existingWalletAddress = data?.wallet_address || null;
    } else if (telegram_id) {
      const { data } = await supabase
        .from('user_wallets')
        .select('wallet_address')
        .eq('telegram_id', telegram_id)
        .single();
      existingWalletAddress = data?.wallet_address || null;
    }

    if (existingWalletAddress) {
      return NextResponse.json({
        success: true,
        wallet: {
          address: existingWalletAddress,
          exists: true
        }
      });
    }

    // Validate tenant configuration
    if (!RECEIPTX_TENANT_CONFIG.tenant_salt || !RECEIPTX_TENANT_CONFIG.tenant_pepper) {
      return NextResponse.json(
        { success: false, error: 'Wallet generation not configured. Please set RECEIPTX_TENANT_SALT and RECEIPTX_TENANT_PEPPER' },
        { status: 500 }
      );
    }

    // Derive wallet using email + (password or 2FA) + server pepper
    const userSecret = password || twofa;
    const method = password ? 'password' : '2fa';
    const generator = new MultiTenantWalletGenerator();
    // Use userSecret as additional entropy for wallet derivation
    const wallet = await generator.generateWalletForTenant({
      email,
      telegram_id,
      tenant_id: RECEIPTX_TENANT_CONFIG.tenant_id,
      biometrics,
      userSecret
    }, RECEIPTX_TENANT_CONFIG, userSecret);

    // Encrypt private key with userSecret
    const encryptedKey = await encryptPrivateKey(wallet.privateKey, userSecret);

    // Store in Supabase (do not return full data)
    const { error } = await supabase
      .from('user_wallets')
      .insert({
        user_email: email,
        telegram_id: telegram_id,
        wallet_address: wallet.address,
        encrypted_private_key: encryptedKey,
        encryption_method: method,
        encryption_hint: method === 'password' ? 'user password' : '2FA code',
        derivation_path: 'm/44\'/60\'/0\'/0/0', // Standard Ethereum path
        metadata: {
          created_at: new Date().toISOString(),
          generator_version: '1.0.0'
        }
      });

    if (error) {
      console.error('Error storing wallet:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to store wallet', details: error.message || error },
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
    // Log full error for debugging, but only return minimal info to client
    console.error('Wallet generation error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Wallet generation failed' },
      { status: 500 }
    );
  }
}

// Encrypt private key with user password or 2FA (best practice)
async function encryptPrivateKey(privateKey: string, userSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);
  const keyData = encoder.encode(userSecret);
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
