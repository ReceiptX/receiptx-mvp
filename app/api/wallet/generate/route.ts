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

    // Validate tenant configuration
    if (!RECEIPTX_TENANT_CONFIG.tenant_salt || !RECEIPTX_TENANT_CONFIG.tenant_pepper) {
      return NextResponse.json(
        { success: false, error: 'Wallet generation not configured. Please set RECEIPTX_TENANT_SALT and RECEIPTX_TENANT_PEPPER' },
        { status: 500 }
      );
    }

    // Generate new wallet using multi-tenant system
    const generator = new MultiTenantWalletGenerator();
    const wallet = await generator.generateWalletForTenant({
      email,
      telegram_id,
      tenant_id: RECEIPTX_TENANT_CONFIG.tenant_id,
      biometrics
    }, RECEIPTX_TENANT_CONFIG);

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
