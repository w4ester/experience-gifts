export const config = { runtime: 'edge' };

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function redisCommand(command, url, token) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return new Response(JSON.stringify({ error: 'Redis not configured' }), {
      status: 500, headers: corsHeaders,
    });
  }

  // Extract code from URL path
  const reqUrl = new URL(request.url);
  const pathParts = reqUrl.pathname.split('/');
  const roomCode = pathParts[pathParts.length - 1]?.toLowerCase()?.trim();

  if (!roomCode) {
    return new Response(JSON.stringify({ error: 'Room code required' }), {
      status: 400, headers: corsHeaders,
    });
  }

  try {
    const roomData = await redisCommand(['GET', `signal:${roomCode}`], REDIS_URL, REDIS_TOKEN);
    const room = roomData ? (typeof roomData === 'string' ? JSON.parse(roomData) : roomData) : null;

    // GET with ?answer - Host polling for answer
    if (request.method === 'GET' && reqUrl.searchParams.has('answer')) {
      if (!room) {
        return new Response(JSON.stringify({ error: 'Room not found or expired' }), {
          status: 404, headers: corsHeaders,
        });
      }
      if (!room.answer) {
        return new Response(JSON.stringify({ waiting: true }), {
          status: 202, headers: corsHeaders,
        });
      }
      const answer = room.answer;
      await redisCommand(['DEL', `signal:${roomCode}`], REDIS_URL, REDIS_TOKEN);
      return new Response(JSON.stringify({ answer }), {
        status: 200, headers: corsHeaders,
      });
    }

    // GET - Guest getting the offer
    if (request.method === 'GET') {
      if (!room) {
        return new Response(JSON.stringify({ error: 'Room not found or expired' }), {
          status: 404, headers: corsHeaders,
        });
      }
      return new Response(JSON.stringify({ offer: room.offer }), {
        status: 200, headers: corsHeaders,
      });
    }

    // POST - Guest submitting answer
    if (request.method === 'POST') {
      if (!room) {
        return new Response(JSON.stringify({ error: 'Room not found or expired' }), {
          status: 404, headers: corsHeaders,
        });
      }

      const { sdp } = await request.json();
      if (!sdp) {
        return new Response(JSON.stringify({ error: 'SDP required' }), {
          status: 400, headers: corsHeaders,
        });
      }

      room.answer = sdp;
      await redisCommand(['SET', `signal:${roomCode}`, JSON.stringify(room), 'EX', 900], REDIS_URL, REDIS_TOKEN);
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500, headers: corsHeaders,
    });
  }
}
