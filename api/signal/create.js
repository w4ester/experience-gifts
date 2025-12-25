export const config = { runtime: 'edge' };

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://experience-gifts.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function getCorsHeaders(request) {
  const origin = request.headers.get('origin');
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Simple rate limiting: 20 requests per minute per IP
async function checkRateLimit(ip, redisUrl, redisToken) {
  const key = `ratelimit:create:${ip}`;
  const now = Math.floor(Date.now() / 1000);
  const window = 60; // 1 minute

  // Get current count
  const res = await fetch(redisUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key]),
  });
  const data = await res.json();
  const count = parseInt(data.result) || 0;

  if (count >= 20) {
    return false; // Rate limited
  }

  // Increment and set expiry
  await fetch(redisUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['INCR', key]),
  });
  if (count === 0) {
    await fetch(redisUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EXPIRE', key, window]),
    });
  }
  return true;
}

// Generate friendly 4-char code (lowercase, no confusing chars)
function generateCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function handler(request) {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders,
    });
  }

  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return new Response(JSON.stringify({ error: 'Redis not configured' }), {
      status: 500, headers: corsHeaders,
    });
  }

  // Rate limit check
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const allowed = await checkRateLimit(ip, REDIS_URL, REDIS_TOKEN);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429, headers: corsHeaders,
    });
  }

  try {
    const { sdp } = await request.json();
    if (!sdp) {
      return new Response(JSON.stringify({ error: 'SDP required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Validate SDP size (max 50KB)
    if (sdp.length > 50000) {
      return new Response(JSON.stringify({ error: 'SDP too large' }), {
        status: 400, headers: corsHeaders,
      });
    }

    const code = generateCode();
    const data = JSON.stringify({ offer: sdp, answer: null, created: Date.now() });
    await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['SET', `signal:${code}`, data, 'EX', 900]),
    });

    return new Response(JSON.stringify({ code }), {
      status: 200, headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: corsHeaders,
    });
  }
}
