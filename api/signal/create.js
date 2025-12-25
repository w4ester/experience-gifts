const { Redis } = require('@upstash/redis');

// Redis for persistent storage (if configured), otherwise in-memory fallback
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// Fallback in-memory storage
const rooms = global.signalRooms || (global.signalRooms = new Map());

// Generate friendly 4-char code (lowercase, no confusing chars)
function generateCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sdp } = req.body;
    if (!sdp) {
      return res.status(400).json({ error: 'SDP required' });
    }

    // Generate unique code
    let code = generateCode();

    if (redis) {
      // Use Redis - check for uniqueness and store with 15 min expiry
      let attempts = 0;
      while (attempts < 10) {
        const existing = await redis.get(`signal:${code}`);
        if (!existing) break;
        code = generateCode();
        attempts++;
      }

      await redis.set(`signal:${code}`, JSON.stringify({
        offer: sdp,
        answer: null,
        created: Date.now()
      }), { ex: 900 }); // 15 minutes
    } else {
      // Fallback to in-memory
      let attempts = 0;
      while (rooms.has(code) && attempts < 10) {
        code = generateCode();
        attempts++;
      }
      rooms.set(code, {
        offer: sdp,
        answer: null,
        created: Date.now()
      });
    }

    return res.status(200).json({ code });
  } catch (error) {
    console.error('Create room error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
