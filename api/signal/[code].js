// Shared room storage (same instance as create.js)
const rooms = global.signalRooms || (global.signalRooms = new Map());

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

  const room = rooms.get(roomCode);

  // GET /api/signal/[code] - Get offer (guest joining)
  if (req.method === 'GET') {
    // Check for ?answer query param - host polling for answer
    if (req.query.answer !== undefined) {
      if (!room) {
        return res.status(404).json({ error: 'Room not found or expired' });
      }
      if (!room.answer) {
        return res.status(202).json({ error: 'Waiting for guest' });
      }
      // Return answer and clean up
      const answer = room.answer;
      rooms.delete(roomCode);
      return res.status(200).json({ answer });
    }

    // Guest getting the offer
    if (!room) {
      return res.status(404).json({ error: 'Room not found or expired' });
    }
    return res.status(200).json({ offer: room.offer });
  }

  // POST /api/signal/[code] - Submit answer (guest responding)
  if (req.method === 'POST') {
    if (!room) {
      return res.status(404).json({ error: 'Room not found or expired' });
    }

    const { sdp } = req.body;
    if (!sdp) {
      return res.status(400).json({ error: 'SDP required' });
    }

    room.answer = sdp;
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
