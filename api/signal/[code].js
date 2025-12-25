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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Rate limiting: 60 requests per minute per IP (polling needs more headroom)
async function checkRateLimit(ip, redisUrl, redisToken) {
  const key = `ratelimit:signal:${ip}`;
  const res = await fetch(redisUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['GET', key]),
  });
  const data = await res.json();
  const count = parseInt(data.result) || 0;

  if (count >= 60) {
    return false;
  }

  await fetch(redisUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['INCR', key]),
  });
  if (count === 0) {
    await fetch(redisUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EXPIRE', key, 60]),
    });
  }
  return true;
}

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
  const corsHeaders = getCorsHeaders(request);

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

  // Rate limit check
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const allowed = await checkRateLimit(ip, REDIS_URL, REDIS_TOKEN);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Try again in a minute.' }), {
      status: 429, headers: corsHeaders,
    });
  }

  // Extract code from URL path
  const reqUrl = new URL(request.url);
  const pathParts = reqUrl.pathname.split('/');
  const roomCode = pathParts[pathParts.length - 1]?.toLowerCase()?.trim();

  if (!roomCode || roomCode.length !== 4) {
    return new Response(JSON.stringify({ error: 'Invalid room code' }), {
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

      // Validate SDP size (max 50KB)
      if (sdp.length > 50000) {
        return new Response(JSON.stringify({ error: 'SDP too large' }), {
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
