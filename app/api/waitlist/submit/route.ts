import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseServiceClient';
import { issueWaitlistSignupRewards } from '@/lib/rewardsWaitlistDirect';
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
        console.log('🔑 Generating wallet for user_id:', userId);
        
        // Derive wallet from user_id (deterministic)
        const entropy = deriveWalletEntropy(userId);
        console.log('  ✓ Entropy derived');
        
        const keypair = createSupraKeypairFromEntropy(entropy);
        console.log('  ✓ Keypair created:', {
          address: keypair.address,
          hasPrivateKey: !!keypair.privateKey,
          privateKeyLength: keypair.privateKey?.length
        });

        // Encrypt private key using AES-256-GCM
        const encrypted = encryptPrivateKey(keypair.privateKey);
        console.log('  ✓ Private key encrypted');
        
        const encryptedPrivateKey = JSON.stringify(encrypted);

        // Store wallet with user_id foreign key (using only columns that exist)
        const { data: walletData, error: walletInsertError } = await supabaseService
          .from('user_wallets')
          .insert({
            user_id: userId,
            wallet_address: keypair.address,
            encrypted_private_key: encryptedPrivateKey,
            user_email: email,
          })
          .select('wallet_address')
          .single();

        if (walletInsertError) {
          console.error('❌ Wallet insert error:', walletInsertError);
          // IMPORTANT: This should not be silently ignored
          throw new Error(`Wallet creation failed: ${walletInsertError.message}`);
        }
        
        console.log('✅ Wallet created successfully:', walletData.wallet_address);
      } catch (walletError: any) {
        console.error('❌ CRITICAL: Wallet generation failed:', walletError);
        console.error('   Error details:', {
          message: walletError.message,
          stack: walletError.stack,
          code: walletError.code
        });
        
        // Return error instead of silently continuing
        // This is critical - users need wallets to participate
        return NextResponse.json(
          { 
            success: false, 
            error: 'Wallet generation failed. Please contact support.',
            details: walletError.message 
          },
          { status: 500 }
        );
      }
    } else {
      console.log('ℹ️  Wallet already exists:', existingWallet.wallet_address);
    }

    // 4. Issue waitlist signup rewards immediately (1000 RWT + 5 AIA)
    try {
      console.log('💰 Issuing waitlist signup rewards for user_id:', userId);
      const rewardResult = await issueWaitlistSignupRewards(userId);
      
      if (!rewardResult.success) {
        throw new Error(`Reward issuance failed: ${rewardResult.reason || 'unknown'}`);
      }
      
      console.log('✅ Rewards issued:', rewardResult);
    } catch (rewardError: any) {
      console.error('❌ CRITICAL: Failed to issue waitlist rewards:', rewardError);
      console.error('   Error details:', {
        message: rewardError.message,
        code: rewardError.code
      });
      
      // This is critical - users expect their 1000 RWT signup bonus
      return NextResponse.json(
        { 
          success: false, 
          error: 'Reward issuance failed. Please contact support.',
          details: rewardError.message 
        },
        { status: 500 }
      );
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

          // Issue referral reward immediately (5 or 10 AIA based on multiplier)
          const { issueReferralReward } = await import('@/lib/rewardsWaitlistDirect');
          await issueReferralReward(referrer.id, false);
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
