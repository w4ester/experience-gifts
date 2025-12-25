// In-memory room storage (shared across function invocations in same instance)
// Vercel edge functions are stateless, so we use a simple Map with cleanup
const rooms = global.signalRooms || (global.signalRooms = new Map());

// Generate friendly 4-char code (no confusing chars like 0/O, 1/I/L)
function generateCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Clean up rooms older than 5 minutes
function cleanupOldRooms() {
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (room.created < cutoff) {
      rooms.delete(code);
    }
  }
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
    cleanupOldRooms();

    const { sdp } = req.body;
    if (!sdp) {
      return res.status(400).json({ error: 'SDP required' });
    }

    // Generate unique code
    let code = generateCode();
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

    return res.status(200).json({ code });
  } catch (error) {
    console.error('Create room error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
