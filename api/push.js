// api/push.js
// Hermes POST 到這裡 → 存進 Vercel KV → 網頁讀取

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST：Hermes 推送資料 ──
  if (req.method === 'POST') {
    const secret = process.env.HERMES_SECRET;
    const auth = req.headers['authorization'];

    if (secret && auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }

      // 加上時間戳
      payload.pushed_at = new Date().toISOString();

      // 存進 Vercel KV
      const { kv } = await import('@vercel/kv');
      await kv.set('hermes:dashboard', JSON.stringify(payload));

      return res.status(200).json({ ok: true, pushed_at: payload.pushed_at });
    } catch (err) {
      console.error('Push error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET：網頁來讀資料 ──
  if (req.method === 'GET') {
    try {
      const { kv } = await import('@vercel/kv');
      const raw = await kv.get('hermes:dashboard');

      if (!raw) {
        return res.status(200).json({ empty: true, message: '還沒有資料，等 Hermes 推送' });
      }

      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return res.status(200).json(data);
    } catch (err) {
      console.error('Read error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
