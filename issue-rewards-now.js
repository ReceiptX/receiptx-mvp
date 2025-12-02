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
    
    console.log('💰 Issuing waitlist rewards for:', email);
    console.log('   Target: 1000 RWT + 5 AIA\n');
    
    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      console.error('❌ User not found');
      return;
    }
    
    console.log('✅ User ID:', user.id);
    
    // Step 1: Check if rewards already exist
    const { data: existingRwt } = await supabase
      .from('rwt_transactions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    
    if (existingRwt && existingRwt.length > 0) {
      console.log('⚠️  RWT transactions already exist - skipping');
      return;
    }
    
    // Step 2: Insert RWT transaction
    console.log('\nStep 1: Creating RWT transaction...');
    const { data: rwtTx, error: rwtError } = await supabase
      .from('rwt_transactions')
      .insert({
        user_id: user.id,
        amount: 1000,
        source: 'waitlist_signup',
        direction: 'credit'
      })
      .select()
      .single();
    
    if (rwtError) {
      console.error('❌ RWT Error:', rwtError.message);
      console.error('   Details:', rwtError.details);
      console.error('   Hint:', rwtError.hint);
      return;
    }
    
    console.log('✅ RWT transaction created:', rwtTx.id);
    
    // Step 3: Insert AIA transaction
    console.log('\nStep 2: Creating AIA transaction...');
    const { data: aiaTx, error: aiaError} = await supabase
      .from('aia_transactions')
      .insert({
        user_id: user.id,
        amount: 5,
        source: 'waitlist_signup',
        direction: 'credit'
      })
      .select()
      .single();
    
    if (aiaError) {
      console.error('❌ AIA Error:', aiaError.message);
      console.error('   Details:', aiaError.details);
      return;
    }
    
    console.log('✅ AIA transaction created:', aiaTx.id);
    
    // Step 4: Create reward log
    console.log('\nStep 3: Creating reward log...');
    const { data: log, error: logError } = await supabase
      .from('reward_logs')
      .insert({
        user_id: user.id,
        action: 'waitlist_signup',
        rwt_amount: 1000,
        aia_amount: 5,
        details: { source: 'manual_recovery', email }
      })
      .select()
      .single();
    
    if (logError) {
      console.error('❌ Log Error:', logError.message);
      // Non-fatal
    } else {
      console.log('✅ Reward log created:', log.id);
    }
    
    console.log('\n🎉 SUCCESS! Rewards issued:');
    console.log('   ✅ 1000 RWT');
    console.log('   ✅ 5 AIA');
    console.log('\nRun: node check-rewards-detailed.js to verify');
    
  } catch (err) {
    console.error('Fatal error:', err);
  }
})();
