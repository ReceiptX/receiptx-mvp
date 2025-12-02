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
    console.log('Checking user_wallets table schema...\n');
    
    // Try to select all columns to see what exists
    const { data, error } = await supabase
      .from('user_wallets')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Columns in user_wallets table:');
      Object.keys(data[0]).forEach(col => {
        console.log(`   - ${col}`);
      });
    } else {
      console.log('ℹ️  Table is empty, checking via metadata...');
      
      // Try inserting minimal data to see what's required
      const testInsert = await supabase
        .from('user_wallets')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          wallet_address: 'test',
        });
      
      console.log('Test insert error (shows required columns):');
      console.log(testInsert.error);
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
