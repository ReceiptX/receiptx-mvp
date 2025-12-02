const { createClient } = require('@supabase/supabase-js');

// Load env vars manually
const fs = require('fs');
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLeaderboardView() {
  console.log('🔍 Checking v_top_referrers view...\n');

  // Try to query the view
  const { data: viewData, error: viewError } = await supabase
    .from('v_top_referrers')
    .select('*')
    .limit(1);

  if (viewError) {
    console.log('❌ View does not exist or has errors:', viewError.message);
    console.log('\n📋 Checking referrals table instead...\n');
    
    // Check the referrals table structure
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('*')
      .limit(1);
    
    if (refError) {
      console.log('❌ Referrals table error:', refError.message);
    } else {
      console.log('✅ Referrals table structure:', JSON.stringify(referrals, null, 2));
    }

    // Check if we need to create the view
    console.log('\n💡 View needs to be created in the database.');
    console.log('📝 SQL to create view:');
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
    
  } else {
    console.log('✅ View exists! Data:', JSON.stringify(viewData, null, 2));
  }
}

checkLeaderboardView();
