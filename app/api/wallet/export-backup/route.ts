import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import crypto from 'crypto';
export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

/**
 * POST /api/wallet/export-backup
 * ==============================
 * Export encrypted wallet backup for user download
 */
export async function POST(req: NextRequest) {
  try {
    const { wallet_address, user_email } = await req.json();

    if (!wallet_address || !user_email) {
      return NextResponse.json(
        { error: 'Wallet address and email required' },
        { status: 400 }
      );
    }

    // Fetch wallet details from database
    const { data: wallet, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('user_email', user_email)
      .single();

    if (error || !wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Create backup JSON (encrypted in production)
    const backupData = {
      wallet_address: wallet.wallet_address,
      public_key: wallet.public_key,
      // In production, these would be encrypted with user password
      private_key: wallet.private_key,
      mnemonic: wallet.mnemonic || 'Not available for this wallet type',
      created_at: wallet.created_at,
      blockchain_network: wallet.blockchain_network || 'supra_testnet',
      user_email: user_email,
      backup_date: new Date().toISOString(),
      instructions: {
        warning: '⚠️ KEEP THIS FILE SECURE! Anyone with this file can access your wallet.',
        recovery: 'Import this file to restore your wallet on any device.',
        support: 'Contact support@receiptx.com for recovery assistance.'
      }
    };

    // Convert to JSON blob
    const backupJson = JSON.stringify(backupData, null, 2);
    const blob = Buffer.from(backupJson, 'utf-8');

    // Return as downloadable file
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="receiptx-wallet-backup-${Date.now()}.json"`,
      },
    });

  } catch (error) {
    console.error('Wallet backup error:', error);
    return NextResponse.json(
      { error: 'Failed to export wallet backup' },
      { status: 500 }
    );
  }
}

