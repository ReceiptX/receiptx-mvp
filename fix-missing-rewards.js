const fs = require('fs');

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

(async () => {
  try {
    const email = 'plinkosanon@gmail.com';
    
    console.log('💰 Issuing waitlist rewards for:', email);
    console.log('   Expected: 1000 RWT + 5 AIA\n');
    
    // Step 1: Generate wallet if missing
    console.log('Step 1: Checking wallet...');
    let walletResponse = await fetch('http://localhost:3000/api/wallet/generate-for-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    let walletResult = await walletResponse.json();
    
    if (walletResult.success) {
      console.log('✅ Wallet ready:', walletResult.wallet_address);
    } else {
      console.error('❌ Wallet generation failed:', walletResult.error);
      return;
    }
    
    // Step 2: Create and process waitlist reward job
    console.log('\nStep 2: Creating waitlist reward...');
    let rewardResponse = await fetch('http://localhost:3000/api/rewards/create-waitlist-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    let rewardResult = await rewardResponse.json();
    
    if (rewardResult.success) {
      console.log('✅ Rewards issued successfully!');
      console.log('   Job ID:', rewardResult.job_id);
      if (rewardResult.rewards) {
        console.log('   RWT:', rewardResult.rewards.rwt);
        console.log('   AIA:', rewardResult.rewards.aia);
      }
    } else {
      console.error('❌ Reward creation failed:', rewardResult.error);
      if (rewardResult.details) {
        console.error('   Details:', rewardResult.details);
      }
    }
    
    // Step 3: Verify
    console.log('\nStep 3: Verifying rewards...');
    console.log('   Run: node check-rewards-detailed.js');
    
  } catch (err) {
    console.error('Fatal error:', err.message);
    console.log('\n⚠️  Make sure Next.js dev server is running: npm run dev');
  }
})();
