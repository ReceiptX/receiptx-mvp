// Quick schema checker
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  // Check receipts table
  console.log('📋 RECEIPTS TABLE:');
  const { data: receipts, error: receiptsError } = await supabase
    .from('receipts')
    .select('*')
    .limit(1);
  
  if (receiptsError) {
    console.error('❌ Error querying receipts:', receiptsError.message);
  } else {
    const columns = receipts[0] ? Object.keys(receipts[0]) : [];
    console.log('   Columns:', columns.join(', '));
    console.log('   ✅ rwt_earned exists:', columns.includes('rwt_earned'));
    console.log('   ✅ receipt_hash exists:', columns.includes('receipt_hash'));
    console.log('   ✅ tenant_id exists:', columns.includes('tenant_id'));
    console.log('   ✅ fraud_score exists:', columns.includes('fraud_score'));
  }

  // Check user_stats table
  console.log('\n📊 USER_STATS TABLE:');
  const { data: stats, error: statsError } = await supabase
    .from('user_stats')
    .select('*')
    .limit(1);
  
  if (statsError) {
    console.error('❌ Error querying user_stats:', statsError.message);
  } else {
    const columns = stats[0] ? Object.keys(stats[0]) : [];
    console.log('   Columns:', columns.join(', '));
    console.log('   ✅ total_rwt_earned exists:', columns.includes('total_rwt_earned'));
    console.log('   ✅ total_aia_earned exists:', columns.includes('total_aia_earned'));
  }

  // Check user_rewards table
  console.log('\n💰 USER_REWARDS TABLE:');
  const { data: rewards, error: rewardsError } = await supabase
    .from('user_rewards')
    .select('*')
    .limit(1);
  
  if (rewardsError) {
    console.error('❌ Error querying user_rewards:', rewardsError.message);
  } else {
    const columns = rewards[0] ? Object.keys(rewards[0]) : [];
    console.log('   Columns:', columns.join(', '));
    console.log('   ✅ user_email exists:', columns.includes('user_email'));
    console.log('   ✅ total_reward exists:', columns.includes('total_reward'));
  }

  // Check user_nfts table
  console.log('\n🎨 USER_NFTS TABLE:');
  const { data: nfts, error: nftsError } = await supabase
    .from('user_nfts')
    .select('*')
    .limit(1);
  
  if (nftsError) {
    console.error('❌ Error querying user_nfts:', nftsError.message);
  } else {
    console.log('   ✅ Table exists');
  }

  // Check user_tiers table
  console.log('\n🏆 USER_TIERS TABLE:');
  const { data: tiers, error: tiersError } = await supabase
    .from('user_tiers')
    .select('*')
    .limit(1);
  
  if (tiersError) {
    console.error('❌ Error querying user_tiers:', tiersError.message);
  } else {
    console.log('   ✅ Table exists');
  }

  console.log('\n✅ Schema check complete!');
}

checkSchema().catch(console.error);
