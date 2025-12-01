// Netlify Background Function for processing rewards
// Runs in the background without blocking HTTP response
// Triggered every 15 minutes via Netlify Scheduled Functions

export const handler = async (event, context) => {
  const BASE_URL = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:3000';
  const POLL_ENDPOINT = `${BASE_URL.replace(/\/$/, '')}/api/rewards/process`;

  try {
    console.log('[Reward Worker]', new Date().toISOString(), 'Processing rewards...');
    
    const response = await fetch(POLL_ENDPOINT, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Reward Worker] Error:', response.status, text);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: text })
      };
    }

    const result = await response.json();
    console.log('[Reward Worker] Success:', result.processed ?? 0, 'jobs processed');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        processed: result.processed,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('[Reward Worker] Fatal error:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};
