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
    console.log('=== CHECKING ALL TABLES AND THEIR COLUMNS ===\n');
    
    const tables = [
      'users',
      'waitlist',
      'user_wallets',
      'receipts',
      'reward_jobs',
      'reward_logs',
      'rwt_transactions',
      'aia_transactions',
      'user_stats',
      'user_tiers',
      'user_nfts',
      'nft_catalog',
      'referrals'
    ];
    
    for (const table of tables) {
      console.log(`\n📋 ${table.toUpperCase()}`);
      
      // Try to fetch one row to see columns
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === 'PGRST204') {
          console.log('   ✅ Table exists but is empty');
          // Try to get column info from error hint
          console.log('   Columns: (need to query pg_catalog)');
        } else {
          console.log(`   ❌ Error: ${error.message}`);
          if (error.hint) console.log(`   Hint: ${error.hint}`);
        }
      } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log(`   ✅ Table exists with ${columns.length} columns:`);
        console.log('   ' + columns.join(', '));
      } else {
        console.log('   ✅ Table exists but is empty');
      }
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
