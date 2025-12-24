import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  // CORS headers
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
    const { booklet, coupons, gifters } = req.body;

    // Generate a short, friendly ID
    const id = randomUUID().slice(0, 8);

    const data = {
      booklet: booklet || { title: '', recipient: '', theme: '🎄 Holiday' },
      coupons: coupons || [],
      gifters: gifters || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in Redis with 1 year expiry
    await redis.set(`booklet:${id}`, JSON.stringify(data), { ex: 31536000 });

    return res.status(200).json({ id, ...data });
  } catch (error) {
    console.error('Create booklet error:', error);
    return res.status(500).json({ error: 'Failed to create booklet' });
  }
}
