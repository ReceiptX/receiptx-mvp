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
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
});

console.log('Loaded Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'YES' : 'NO');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  try {
    const email = 'plinkosanon@gmail.com'; // The actual user in DB
    
    // Check all users first
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .limit(10);
    
    console.log('=== ALL USERS (first 10) ===');
    if (allError) {
      console.error('❌ Error fetching all users:', allError);
    } else {
      console.log(`Found ${allUsers.length} users total`);
      allUsers.forEach(u => console.log(`  - ${u.email} (${u.id})`));
    }
    
    // Check user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('email', email)
      .maybeSingle();
    
    console.log('=== USER CHECK ===');
    if (userError) {
      console.error('❌ Error fetching user:', userError);
      return;
    }
    
    if (!user) {
      console.log('❌ No user found with email:', email);
      return;
    }
    
    console.log('✅ User found:', user);
    
    // Check wallet
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    console.log('\n=== WALLET CHECK ===');
    if (walletError) {
      console.error('❌ Error fetching wallet:', walletError);
      return;
    }
    
    if (!wallet) {
      console.log('❌ No wallet found for user_id:', user.id);
      console.log('\nℹ️  This is the issue - wallet was not created during signup!');
    } else {
      console.log('✅ Wallet found:', {
        wallet_address: wallet.wallet_address,
        blockchain_network: wallet.blockchain_network,
        encryption_method: wallet.encryption_method,
        created_at: wallet.created_at
      });
    }
    
    // Check waitlist
    const { data: waitlist, error: waitlistError } = await supabase
      .from('waitlist')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    console.log('\n=== WAITLIST CHECK ===');
    if (waitlistError) {
      console.error('❌ Error fetching waitlist:', waitlistError);
    } else if (!waitlist) {
      console.log('❌ No waitlist entry found');
    } else {
      console.log('✅ Waitlist entry found:', waitlist);
    }
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
