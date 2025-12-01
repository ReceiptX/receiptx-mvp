import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServiceClient';
import { enqueueWaitlistSignupRewards } from '@/lib/rewardsWaitlist';
import { deriveWalletEntropy, createSupraKeypairFromEntropy } from '@/lib/crypto/walletDerivation';
import { encryptPrivateKey } from '@/lib/crypto/aesGcm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, referral_code } = body;
    
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email required' }, { status: 400 });
    }

    // 1. Upsert user by email to guarantee a UUID
    const { data: existingUser } = await supabaseService
      .from('users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: userInsertError } = await supabaseService
        .from('users')
        .insert({ email })
        .select('id')
        .single();

      if (userInsertError || !newUser) {
        console.error('Failed to create user:', userInsertError);
        return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 });
      }

      userId = newUser.id;
    }

    // 2. Upsert waitlist with user_id
    const { error: waitlistError } = await supabaseService
      .from('waitlist')
      .upsert(
        { 
          user_id: userId, 
          email,
          updated_at: new Date().toISOString()
        }, 
        { onConflict: 'email' }
      );

    if (waitlistError) {
      console.error('Waitlist upsert error:', waitlistError);
      // Non-fatal - user was created, continue
    }

    // 3. Generate deterministic wallet immediately (hidden from user)
    // Check if wallet already exists
    const { data: existingWallet } = await supabaseService
      .from('user_wallets')
      .select('wallet_address')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingWallet) {
      try {
        // Derive wallet from user_id (deterministic)
        const entropy = deriveWalletEntropy(userId);
        const keypair = createSupraKeypairFromEntropy(entropy);

        // Encrypt private key using AES-256-GCM
        const encrypted = encryptPrivateKey(keypair.privateKey);
        const encryptedPrivateKey = JSON.stringify(encrypted);

        // Store wallet with user_id foreign key
        const { error: walletInsertError } = await supabaseService
          .from('user_wallets')
          .insert({
            user_id: userId,
            wallet_address: keypair.address,
            encrypted_private_key: encryptedPrivateKey,
            encryption_method: 'AES-256-GCM',
            blockchain_network: 'supra_testnet',
            user_email: email,
          });

        if (walletInsertError) {
          console.error('Wallet insert error:', walletInsertError);
          // Non-fatal - continue with rewards
        }
      } catch (walletError) {
        console.error('Wallet generation failed:', walletError);
        // Non-fatal - user created, continue
      }
    }

    // 4. Enqueue reward job for waitlist signup
    try {
      await enqueueWaitlistSignupRewards(userId, null);
    } catch (rewardError) {
      console.error('Failed to enqueue waitlist reward:', rewardError);
      // Non-fatal - log but don't fail the request
    }

    // 5. Handle referral if provided
    if (referral_code) {
      try {
        // Find referrer by referral_code
        const { data: referrer } = await supabaseService
          .from('users')
          .select('id')
          .eq('referral_code', referral_code)
          .maybeSingle();

        if (referrer) {
          // Create referral record
          await supabaseService
            .from('referrals')
            .insert({
              referrer_user_id: referrer.id,
              referred_user_id: userId,
              referrer_code: referral_code,
            });

          // Enqueue referral reward (5 or 10 AIA based on multiplier)
          const { enqueueReferralRewards } = await import('@/lib/rewardsWaitlist');
          await enqueueReferralRewards(referrer.id, false);
        }
      } catch (referralError) {
        console.error('Referral processing error:', referralError);
        // Non-fatal
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error('Waitlist submit error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
