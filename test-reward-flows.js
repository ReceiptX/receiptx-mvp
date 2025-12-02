/**
 * Test script to verify all reward flows work correctly
 * 
 * Tests:
 * 1. Waitlist signup creates rwt_transactions and aia_transactions
 * 2. Receipt upload creates rwt_transactions
 * 3. Referral rewards create aia_transactions
 * 4. Leaderboard view returns data correctly
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or hardcode them temporarily
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testWaitlistRewards() {
  console.log('\n🧪 TEST 1: Waitlist Signup Rewards');
  console.log('=====================================');
  
  const testEmail = `test-${Date.now()}@example.com`;
  
  try {
    // Simulate waitlist signup
    const response = await fetch('http://localhost:3000/api/waitlist/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    
    const data = await response.json();
    console.log('✅ Waitlist signup response:', data);
    
    // Wait a moment for transactions to be inserted
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for transactions
    const { data: rwtData } = await supabase
      .from('rwt_transactions')
      .select('*')
      .eq('source', 'waitlist_signup')
      .order('created_at', { ascending: false })
      .limit(1);
    
    const { data: aiaData } = await supabase
      .from('aia_transactions')
      .select('*')
      .eq('source', 'waitlist_signup')
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log('RWT Transaction:', rwtData?.[0] || '❌ Not found');
    console.log('AIA Transaction:', aiaData?.[0] || '❌ Not found');
    
    if (rwtData?.length > 0 && aiaData?.length > 0) {
      console.log('✅ Waitlist rewards working correctly!');
      return true;
    } else {
      console.log('❌ Waitlist rewards not creating transactions');
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function testReceiptRewards() {
  console.log('\n🧪 TEST 2: Receipt Upload Rewards');
  console.log('===================================');
  
  // Check recent receipt transactions
  const { data: recentReceipts } = await supabase
    .from('receipts')
    .select('id, user_email, rwt_earned, created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (!recentReceipts || recentReceipts.length === 0) {
    console.log('⚠️ No receipts found - upload a receipt to test this');
    return false;
  }
  
  const receipt = recentReceipts[0];
  console.log('Most recent receipt:', receipt);
  
  // Check if there's a corresponding RWT transaction
  const { data: rwtTx } = await supabase
    .from('rwt_transactions')
    .select('*')
    .ilike('source', `receipt_${receipt.id}%`);
  
  console.log('RWT Transaction:', rwtTx || '❌ Not found');
  
  if (rwtTx && rwtTx.length > 0) {
    console.log('✅ Receipt rewards working correctly!');
    return true;
  } else {
    console.log('❌ Receipt not creating rwt_transactions');
    return false;
  }
}

async function testReferralRewards() {
  console.log('\n🧪 TEST 3: Referral Rewards');
  console.log('=============================');
  
  // Check for recent referrals
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*')
    .eq('status', 'rewarded')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (!referrals || referrals.length === 0) {
    console.log('⚠️ No rewarded referrals found - complete a referral to test this');
    return false;
  }
  
  const referral = referrals[0];
  console.log('Recent referral:', referral);
  
  // Check for AIA transaction
  const { data: aiaTx } = await supabase
    .from('aia_transactions')
    .select('*')
    .eq('user_id', referral.referrer_user_id)
    .eq('source', 'referral_bonus');
  
  console.log('AIA Transaction:', aiaTx || '❌ Not found');
  
  if (aiaTx && aiaTx.length > 0) {
    console.log('✅ Referral rewards working correctly!');
    return true;
  } else {
    console.log('❌ Referrals not creating aia_transactions');
    return false;
  }
}

async function testLeaderboard() {
  console.log('\n🧪 TEST 4: Leaderboard View');
  console.log('============================');
  
  try {
    const { data, error } = await supabase
      .from('v_top_referrers')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Leaderboard view error:', error.message);
      console.log('\n💡 Run this SQL in Supabase to create the view:');
      console.log(`
CREATE OR REPLACE VIEW v_top_referrers AS
SELECT 
  r.referrer_user_id,
  u.email as referrer_email,
  u.telegram_id as referrer_telegram_id,
  w.wallet_address as referrer_wallet_address,
  COUNT(DISTINCT r.id) as total_referrals,
  COUNT(DISTINCT CASE WHEN r.status = 'rewarded' THEN r.id END) as qualified_referrals,
  COALESCE(SUM(r.aia_bonus_amount), 0) as total_aia_earned
FROM referrals r
LEFT JOIN users u ON u.id = r.referrer_user_id
LEFT JOIN user_wallets w ON w.user_id = r.referrer_user_id
WHERE r.status IN ('qualified', 'rewarded')
GROUP BY r.referrer_user_id, u.email, u.telegram_id, w.wallet_address
ORDER BY total_referrals DESC, total_aia_earned DESC;
      `);
      return false;
    }
    
    console.log('✅ Leaderboard view exists!');
    console.log('Top referrers:', JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Running ReceiptX Reward System Tests');
  console.log('========================================\n');
  
  const results = {
    waitlist: await testWaitlistRewards(),
    receipts: await testReceiptRewards(),
    referrals: await testReferralRewards(),
    leaderboard: await testLeaderboard()
  };
  
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Waitlist Rewards: ${results.waitlist ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Receipt Rewards: ${results.receipts ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Referral Rewards: ${results.referrals ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Leaderboard: ${results.leaderboard ? '✅ PASS' : '❌ FAIL'}`);
  
  const totalPassed = Object.values(results).filter(Boolean).length;
  console.log(`\n${totalPassed}/4 tests passed`);
}

// Run if called directly
if (require.main === module) {
  runAllTests();
}

module.exports = { testWaitlistRewards, testReceiptRewards, testReferralRewards, testLeaderboard };
