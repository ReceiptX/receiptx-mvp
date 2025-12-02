const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Load env
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
    
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('=== USER ===');
    console.log(`✅ ${user.email} (${user.id})\n`);
    
    // Check RWT transactions
    const { data: rwtTx, error: rwtError } = await supabase
      .from('rwt_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    console.log('=== RWT TRANSACTIONS ===');
    if (rwtError) {
      console.error('❌ Error:', rwtError.message);
    } else if (!rwtTx || rwtTx.length === 0) {
      console.log('❌ No RWT transactions - Waitlist reward NOT issued!');
    } else {
      const totalRWT = rwtTx.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
      console.log(`✅ ${rwtTx.length} transaction(s), Total: ${totalRWT} RWT`);
      rwtTx.slice(0, 5).forEach(tx => {
        console.log(`   ${tx.transaction_type}: ${tx.amount} RWT (${tx.timestamp || tx.created_at})`);
      });
    }
    
    // Check AIA transactions
    const { data: aiaTx, error: aiaError } = await supabase
      .from('aia_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    console.log('\n=== AIA TRANSACTIONS ===');
    if (aiaError) {
      console.error('❌ Error:', aiaError.message);
    } else if (!aiaTx || aiaTx.length === 0) {
      console.log('❌ No AIA transactions');
    } else {
      const totalAIA = aiaTx.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
      console.log(`✅ ${aiaTx.length} transaction(s), Total: ${totalAIA} AIA`);
      aiaTx.slice(0, 5).forEach(tx => {
        console.log(`   ${tx.transaction_type}: ${tx.amount} AIA (${tx.timestamp || tx.created_at})`);
      });
    }
    
    // Check reward_logs
    const { data: logs, error: logsError } = await supabase
      .from('reward_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    console.log('\n=== REWARD LOGS ===');
    if (logsError) {
      console.error('❌ Error:', logsError.message);
    } else if (!logs || logs.length === 0) {
      console.log('❌ No reward logs found');
    } else {
      console.log(`✅ ${logs.length} log(s)`);
      logs.slice(0, 5).forEach(log => {
        console.log(`   ${log.action}: RWT=${log.rwt_amount}, AIA=${log.aia_amount}`);
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
      console.error('❌ Error:', statsError.message);
    } else if (!stats) {
      console.log('❌ No stats record - User never processed any receipts');
    } else {
      console.log(`✅ Total Receipts: ${stats.total_receipts || 0}`);
      console.log(`   Total RWT Earned: ${stats.total_rwt_earned || 0}`);
      console.log(`   Total AIA Earned: ${stats.total_aia_earned || 0}`);
      console.log(`   Current Tier: ${stats.current_tier || 'Bronze'}`);
    }
    
    // Check reward_jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('reward_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    console.log('\n=== REWARD JOBS (Background Processing) ===');
    if (jobsError) {
      console.error('❌ Error:', jobsError.message);
    } else if (!jobs || jobs.length === 0) {
      console.log('❌ No reward jobs - ISSUE: Waitlist reward job was never created!');
      console.log('\nℹ️  This means enqueueWaitlistSignupRewards() failed or was not called.');
    } else {
      console.log(`✅ ${jobs.length} job(s)`);
      jobs.slice(0, 5).forEach(job => {
        console.log(`   ${job.job_type}: ${job.status} (attempts: ${job.attempts})`);
        if (job.last_error) console.log(`     Error: ${job.last_error}`);
      });
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
