export const config = { runtime: 'edge' };

export default function handler(request) {
  return new Response(JSON.stringify({ ok: true, time: Date.now() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
