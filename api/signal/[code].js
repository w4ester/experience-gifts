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

async function redisDel(key) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return false;
  }
  await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/del/${key}`, {
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
  });
  return true;
}

// Fallback in-memory storage (shared with create.js)
const rooms = global.signalRooms || (global.signalRooms = new Map());
const hasRedis = () => process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Helper to get room from Redis or memory
async function getRoom(code) {
  if (hasRedis()) {
    const data = await redisGet(`signal:${code}`);
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
  }
  return rooms.get(code) || null;
}

// Helper to save room to Redis or memory
async function saveRoom(code, room) {
  if (hasRedis()) {
    await redisSet(`signal:${code}`, JSON.stringify(room), 900);
  } else {
    rooms.set(code, room);
  }
}

// Helper to delete room
async function deleteRoom(code) {
  if (hasRedis()) {
    await redisDel(`signal:${code}`);
  } else {
    rooms.delete(code);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { code } = req.query;
  const roomCode = code?.toLowerCase()?.trim();

  if (!roomCode) {
    return res.status(400).json({ error: 'Room code required' });
  }

  try {
    const room = await getRoom(roomCode);

    // GET /api/signal/[code]?answer - Host polling for answer
    if (req.method === 'GET' && req.query.answer !== undefined) {
      if (!room) {
        return res.status(404).json({ error: 'Room not found or expired' });
      }
      if (!room.answer) {
        return res.status(202).json({ waiting: true });
      }
      // Return answer and clean up
      const answer = room.answer;
      await deleteRoom(roomCode);
      return res.status(200).json({ answer });
    }

    // GET /api/signal/[code] - Guest getting the offer
    if (req.method === 'GET') {
      if (!room) {
        return res.status(404).json({ error: 'Room not found or expired' });
      }
      return res.status(200).json({ offer: room.offer });
    }

    // POST /api/signal/[code] - Guest submitting answer
    if (req.method === 'POST') {
      if (!room) {
        return res.status(404).json({ error: 'Room not found or expired' });
      }

      const { sdp } = req.body;
      if (!sdp) {
        return res.status(400).json({ error: 'SDP required' });
      }

      room.answer = sdp;
      await saveRoom(roomCode, room);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Signal API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
