// api/decisions.js — 決策回傳端點

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  async function redisGet(key) {
    const r = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    const data = await r.json();
    return data.result;
  }

  async function redisSet(key, value) {
    await fetch(`${REDIS_URL}/set/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    });
  }

  // POST: 使用者在網頁上選了一個決策
  if (req.method === 'POST') {
    try {
      const { item_id, option_id, item_title } = req.body;
      if (!item_id || !option_id) {
        return res.status(400).json({ error: 'Missing item_id or option_id' });
      }

      // 讀取現有決策佇列
      let queue = [];
      try {
        const raw = await redisGet('hermes:decisions');
        if (raw) queue = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch(e) { queue = []; }

      // 加入新決策
      queue.push({
        item_id,
        option_id,
        item_title: item_title || '',
        decided_at: new Date().toISOString()
      });

      await redisSet('hermes:decisions', JSON.stringify(queue));
      return res.status(200).json({ ok: true, queued: queue.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET: Hermes 來撈未處理的決策
  if (req.method === 'GET') {
    try {
      const raw = await redisGet('hermes:decisions');
      if (!raw) return res.status(200).json({ decisions: [] });

      const queue = typeof raw === 'string' ? JSON.parse(raw) : raw;

      // 撈完就清空（Hermes 拿走就處理）
      const clear = req.headers['x-clear'] === 'true';
      if (clear && queue.length > 0) {
        await redisSet('hermes:decisions', JSON.stringify([]));
      }

      return res.status(200).json({ decisions: queue });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
