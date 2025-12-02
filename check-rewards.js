const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load env manually
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (!line || line.startsWith('#')) return;
  const eqIndex = line.indexOf('=');
  if (eqIndex === -1) return;
  const key = line.substring(0, eqIndex).trim();
  let value = line.substring(eqIndex + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    const email = 'plinkosanon@gmail.com';
    
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('=== USER ===');
    console.log(`Email: ${user.email}`);
    console.log(`ID: ${user.id}`);
    console.log(`Created: ${user.created_at}\n`);
    
    // Check user_rewards (waitlist signup rewards)
    const { data: userRewards, error: rewardsError2 } = await supabase
      .from('user_rewards')
      .select('*')
      .eq('user_id', user.id);
    
    console.log('=== USER REWARDS (from user_rewards table) ===');
    if (rewardsError2) {
      console.error('❌ Error fetching user_rewards:', rewardsError2);
    } else if (!userRewards || userRewards.length === 0) {
      console.log('❌ No user_rewards found - ISSUE: Waitlist reward not issued!');
    } else {
      console.log(`✅ Found ${userRewards.length} reward(s):`);
      userRewards.forEach(r => {
        console.log(`   RWT: ${r.rwt_balance || 0}, AIA: ${r.aia_balance || 0}`);
        console.log(`   Staked AIA: ${r.staked_aia || 0}`);
      });
    }
    
    // Check receipts for RWT earned
    const { data: receipts, error: receiptsError } = await supabase
      .from('receipts')
      .select('rwt_earned, aia_earned, created_at')
      .eq('user_email', email);
    
    console.log('\n=== RECEIPTS ===');
    if (receiptsError) {
      console.error('❌ Error fetching receipts:', receiptsError);
    } else if (!receipts || receipts.length === 0) {
      console.log('❌ No receipts found');
    } else {
      const totalRWT = receipts.reduce((sum, r) => sum + (r.rwt_earned || 0), 0);
      const totalAIA = receipts.reduce((sum, r) => sum + (r.aia_earned || 0), 0);
      console.log(`✅ Found ${receipts.length} receipt(s)`);
      console.log(`   Total RWT from receipts: ${totalRWT}`);
      console.log(`   Total AIA from receipts: ${totalAIA}`);
    }
    
    // Check reward_logs
    const { data: rewards, error: rewardsError } = await supabase
      .from('reward_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    console.log('\n=== REWARD LOGS ===');
    if (rewardsError) {
      console.error('❌ Error fetching rewards:', rewardsError);
    } else if (!rewards || rewards.length === 0) {
      console.log('❌ No reward logs found - ISSUE: No rewards have been issued!');
    } else {
      console.log(`✅ Found ${rewards.length} reward(s):`);
      rewards.forEach(r => {
        console.log(`   - ${r.reward_type}: RWT=${r.rwt_amount}, AIA=${r.aia_amount} (${r.created_at})`);
        if (r.metadata) {
          console.log(`     Metadata: ${JSON.stringify(r.metadata)}`);
        }
      });
    }
    
    // Check user_stats
    const { data: stats, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    console.log('\n=== USER STATS ===');
    if (statsError) {
      console.error('❌ Error fetching stats:', statsError);
    } else if (!stats) {
      console.log('❌ No stats record found');
    } else {
      console.log(`✅ Total Receipts: ${stats.total_receipts || 0}`);
      console.log(`   Total RWT Earned: ${stats.total_rwt_earned || 0}`);
      console.log(`   Total AIA Earned: ${stats.total_aia_earned || 0}`);
      console.log(`   Current Tier: ${stats.current_tier || 'Bronze'}`);
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
