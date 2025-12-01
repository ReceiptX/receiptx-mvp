// Simple reward worker: polls the app API to process pending reward jobs.
// Usage:
//   NODE_ENV=development BASE_URL=http://localhost:3000 node scripts/run_reward_worker.js

const WAIT_MS = process.env.WAIT_MS ? Number(process.env.WAIT_MS) : 15_000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const POLL_ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/rewards/process`;

async function runOnce() {
  try {
    console.log(new Date().toISOString(), 'Polling', POLL_ENDPOINT);
    const res = await fetch(POLL_ENDPOINT, { method: 'POST' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('Worker: non-OK response', res.status, txt);
      return;
    }
    const json = await res.json().catch(() => null);
    console.log('Worker: processed', json?.processed ?? 'unknown');
  } catch (err) {
    console.error('Worker: error polling', err?.message ?? err);
  }
}

async function loop() {
  while (true) {
    await runOnce();
    await new Promise((r) => setTimeout(r, WAIT_MS));
  }
}

if (require.main === module) {
  console.log('Starting reward worker with poll interval', WAIT_MS, 'ms');
  loop();
}

module.exports = { runOnce };
