#!/usr/bin/env node
/**
 * Clear OCR Memory and Fraud Detection Cache
 * Run this script to reset all receipt processing history for fresh testing
 * 
 * Usage:
 *   node scripts/clear_ocr_memory.js
 * 
 * Or from package.json:
 *   npm run clear-ocr
 */

require('dotenv').config({ path: '.env.local' });

async function clearOCRMemory() {
  console.log('🧹 Clearing OCR memory and fraud detection cache...\n');

  // Import Supabase service client
  const { supabaseService } = require('../lib/supabaseServiceClient');

  try {
    // 1. Clear receipts (removes all duplicate detection history)
    console.log('📋 Clearing receipts table...');
    const { error: receiptsError, count: receiptsCount } = await supabaseService
      .from('receipts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible UUID

    if (receiptsError) {
      console.error('❌ Error clearing receipts:', receiptsError.message);
    } else {
      console.log(`✅ Cleared receipts table (${receiptsCount || 0} rows)`);
    }

    // 2. Clear reward jobs
    console.log('💼 Clearing reward_jobs table...');
    const { error: jobsError, count: jobsCount } = await supabaseService
      .from('reward_jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (jobsError) {
      console.error('❌ Error clearing reward_jobs:', jobsError.message);
    } else {
      console.log(`✅ Cleared reward_jobs table (${jobsCount || 0} rows)`);
    }

    // 3. Clear reward logs
    console.log('📝 Clearing reward_logs table...');
    const { error: logsError, count: logsCount } = await supabaseService
      .from('reward_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (logsError) {
      console.error('❌ Error clearing reward_logs:', logsError.message);
    } else {
      console.log(`✅ Cleared reward_logs table (${logsCount || 0} rows)`);
    }

    // 4. Clear RWT transactions
    console.log('💰 Clearing rwt_transactions table...');
    const { error: rwtError, count: rwtCount } = await supabaseService
      .from('rwt_transactions')
      .delete()
      .neq('id', 0);

    if (rwtError) {
      console.error('❌ Error clearing rwt_transactions:', rwtError.message);
    } else {
      console.log(`✅ Cleared rwt_transactions table (${rwtCount || 0} rows)`);
    }

    // 5. Clear AIA transactions
    console.log('🎯 Clearing aia_transactions table...');
    const { error: aiaError, count: aiaCount } = await supabaseService
      .from('aia_transactions')
      .delete()
      .neq('id', 0);

    if (aiaError) {
      console.error('❌ Error clearing aia_transactions:', aiaError.message);
    } else {
      console.log(`✅ Cleared aia_transactions table (${aiaCount || 0} rows)`);
    }

    // 6. Clear referrals (optional)
    console.log('🔗 Clearing referrals table...');
    const { error: referralsError, count: referralsCount } = await supabaseService
      .from('referrals')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (referralsError) {
      console.error('❌ Error clearing referrals:', referralsError.message);
    } else {
      console.log(`✅ Cleared referrals table (${referralsCount || 0} rows)`);
    }

    // 7. Clear plinko drops
    console.log('🎰 Clearing plinko_drops table...');
    const { error: plinkoError, count: plinkoCount } = await supabaseService
      .from('plinko_drops')
      .delete()
      .neq('id', 0);

    if (plinkoError) {
      // Table might not exist, that's okay
      console.log('⚠️  plinko_drops table not found (skipping)');
    } else {
      console.log(`✅ Cleared plinko_drops table (${plinkoCount || 0} rows)`);
    }

    console.log('\n✨ OCR memory cleared successfully!');
    console.log('\n📊 Verification - Run this query in Supabase to confirm:');
    console.log(`
SELECT 'receipts' as table_name, COUNT(*) as count FROM receipts
UNION ALL SELECT 'reward_jobs', COUNT(*) FROM reward_jobs
UNION ALL SELECT 'rwt_transactions', COUNT(*) FROM rwt_transactions
UNION ALL SELECT 'aia_transactions', COUNT(*) FROM aia_transactions
UNION ALL SELECT 'referrals', COUNT(*) FROM referrals;
    `);

    console.log('\n⚠️  NOTE: User data (users, user_wallets, waitlist) was NOT cleared.');
    console.log('    To clear users too, run: npm run clear-all');

  } catch (error) {
    console.error('\n❌ Failed to clear OCR memory:', error);
    process.exit(1);
  }
}

clearOCRMemory();
