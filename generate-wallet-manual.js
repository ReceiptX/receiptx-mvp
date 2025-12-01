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
    
    console.log('🔧 Generating wallet for:', email);
    console.log('📡 Calling API endpoint...\n');
    
    const response = await fetch('http://localhost:3000/api/wallet/generate-for-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ SUCCESS!');
      console.log('   Wallet Address:', result.wallet_address);
      console.log('   Message:', result.message);
    } else {
      console.log('❌ FAILED!');
      console.log('   Error:', result.error);
      if (result.details) {
        console.log('   Details:', result.details);
      }
    }
  } catch (err) {
    console.error('Fatal error:', err.message);
    console.log('\n⚠️  Make sure Next.js dev server is running: npm run dev');
  }
})();
