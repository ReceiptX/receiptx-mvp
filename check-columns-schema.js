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
    console.log('=== CHECKING TABLE COLUMNS FROM SCHEMA ===\n');
    
    const tables = [
      'receipts',
      'reward_jobs', 
      'reward_logs',
      'rwt_transactions',
      'aia_transactions',
      'user_stats',
      'referrals'
    ];
    
    for (const table of tables) {
      console.log(`\n📋 ${table.toUpperCase()}`);
      
      // Query information_schema to get column info
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = '${table}'
          ORDER BY ordinal_position;
        `
      });
      
      if (error) {
        // Fallback: try direct insert to see error
        const testInsert = await supabase.from(table).insert({}).select();
        console.log(`   ❌ Error: ${testInsert.error?.message || 'Unknown'}`);
        if (testInsert.error?.details) {
          console.log(`   Details: ${testInsert.error.details}`);
        }
      } else {
        console.log(`   Columns:`, data);
      }
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
