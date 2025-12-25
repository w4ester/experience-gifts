export const config = { runtime: 'edge' };

export default function handler(request) {
  const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  return new Response(JSON.stringify({
    ok: true,
    time: Date.now(),
    redisConfigured: hasRedis,
    urlSet: !!process.env.UPSTASH_REDIS_REST_URL,
    tokenSet: !!process.env.UPSTASH_REDIS_REST_TOKEN
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
