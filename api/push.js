// api/push.js — Upstash Redis 版本

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({ error: 'Missing Upstash env vars' });
  }

  async function redisSet(key, value) {
    const body = typeof value === 'string' ? value : JSON.stringify(value);
    const r = await fetch(`${REDIS_URL}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'text/plain' },
      body
    });
    return r.json();
  }

  async function redisGet(key) {
    const r = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    const data = await r.json();
    return data.result;
  }

  // ── POST：Hermes 推送 ──
  if (req.method === 'POST') {
    const secret = process.env.HERMES_SECRET;
    const auth   = req.headers['authorization'];
    if (secret && auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      payload.pushed_at = new Date().toISOString();
      await redisSet('hermes:dashboard', JSON.stringify(payload));
      return res.status(200).json({ ok: true, pushed_at: payload.pushed_at });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── GET：網頁讀取 ──
  if (req.method === 'GET') {
    try {
      const raw = await redisGet('hermes:dashboard');
      if (!raw) return res.status(200).json({ empty: true });
      // 處理 double-stringified：parse 到不是字串為止
      let data = raw;
      while (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) { break; }
      }
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
