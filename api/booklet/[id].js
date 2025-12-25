// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://experience-gifts.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

// Only initialize Redis if credentials are provided
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Booklet ID required' });
  }

  // Check if Redis is configured
  if (!redis) {
    return res.status(503).json({ error: 'Cloud sync not configured' });
  }

  try {
    // GET - Fetch booklet
    if (req.method === 'GET') {
      const data = await redis.get(`booklet:${id}`);

      if (!data) {
        return res.status(404).json({ error: 'Booklet not found' });
      }

      // Parse if string (Redis might return string or object depending on client)
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return res.status(200).json({ id, ...parsed });
    }

    // PUT - Update booklet
    if (req.method === 'PUT') {
      const { booklet, coupons, gifters } = req.body;

      // Get existing to preserve createdAt
      const existing = await redis.get(`booklet:${id}`);
      const existingData = existing
        ? (typeof existing === 'string' ? JSON.parse(existing) : existing)
        : {};

      const data = {
        booklet: booklet || existingData.booklet || {},
        coupons: coupons || existingData.coupons || [],
        gifters: gifters || existingData.gifters || [],
        createdAt: existingData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store with 1 year expiry (refreshed on each update)
      await redis.set(`booklet:${id}`, JSON.stringify(data), { ex: 31536000 });

      return res.status(200).json({ id, ...data });
    }

    // DELETE - Remove booklet
    if (req.method === 'DELETE') {
      await redis.del(`booklet:${id}`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Booklet API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
