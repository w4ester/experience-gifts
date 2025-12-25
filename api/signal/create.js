// Direct Upstash REST API (no SDK needed)
async function redisGet(key) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  const data = await res.json();
  return data.result;
}

async function redisSet(key, value, exSeconds) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return false;
  }
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/${key}/${encodeURIComponent(value)}/ex/${exSeconds}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  return true;
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

export default async function handler(req, res) {
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
    const hasRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

    if (hasRedis) {
      // Use Redis - check for uniqueness and store with 15 min expiry
      let attempts = 0;
      while (attempts < 10) {
        const existing = await redisGet(`signal:${code}`);
        if (!existing) break;
        code = generateCode();
        attempts++;
      }

      await redisSet(`signal:${code}`, JSON.stringify({
        offer: sdp,
        answer: null,
        created: Date.now()
      }), 900);
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
}
