---
name: push-dashboard
description: 每天 08:00 自動執行，或手動觸發（push dashboard / 推送儀表板 / 更新指揮中心）。讀取 action_inbox → Claude API 分析成白話 JSON → 推送到 Vercel Dashboard。
triggers:
  - push dashboard
  - 推送儀表板
  - 更新指揮中心
  - 每天 08:00
---

# push-dashboard SKILL
# Hermes 讀取 action_inbox → 分析 → 推送到指揮中心

## 觸發條件
- 每天 08:00 自動執行
- 手動指令：`push dashboard` / `推送儀表板` / 更新指揮中心`
- **⚡ 自動觸發：每次 Hermes 把報告或 handoff 寫入 `action_inbox/` 資料夾後，立即執行一次推送**

### 自動觸發規則
當 Hermes 執行以下任何操作後，**必須**自動觸發 push-dashboard：
1. 新增 .md 檔案到 `00_TO_SORT/action_inbox/`
2. 修改現有的 action_inbox .md 檔案
3. 產生 handoff 文件或任務報告並寫入 action_inbox

**不需要等定時排程，寫完立刻推。**

## 執行步驟

### Step 1：讀取所有 action_inbox 檔案
```bash
find ~/Library/Mobile\ Documents/com~apple~CloudDocs/AI_WORKSPACE/00_TO_SORT/action_inbox -name "*.md" | sort
```

把所有 .md 內容合併成一個字串，檔案之間用 `---` 分隔，每個檔案前加 `# 檔案: {filename}` 標頭。

### Step 2：本地分析成白話 JSON
不用 Claude API，直接在本地用 Python 分析。參考 `references/analysis_prompt.md` 中的 prompt 結構。

輸出 JSON 格式：
```json
{
  "updated_at": "ISO timestamp",
  "total_inbox": N,
  "summary": "一句話總結",
  "items": [
    {
      "id": "唯一ID",
      "date": "YYYY-MM-DD",
      "title": "這份報告在說什麼（白話，20字以內）",
      "status": "待決定|待續|待辦|部分完成|已完成|等待決定|待設定|待處理|待完成|待驗證",
      "description": "2-3句白話，30秒內能懂",
      "next_step": "下一個最小行動"
    }
  ]
}
```

排序：urgent → pending → info → done

### Step 3：POST 到指揮中心 API
```bash
curl -s -X POST https://hermes-dashboard-jade.vercel.app/api/push \
  -H "Content-Type: application/json" \
  -d @/tmp/dashboard_payload.json
```

## 部署注意事項
- Vercel **不會**自動從 GitHub 拉最新 commit
- 每次改完 `api/push.js` 必須手動部署：`vercel --prod`
- 部署前確認 Vercel 環境變數有 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`

## ⚠️ Upstash Redis 已知陷阱

> 完整 API 使用細節見 `references/upstash-redis.md`

### 陷阱 1：Double JSON.stringify
**症狀**：GET 回傳的 JSON 是字串而非物件，`data.items` 為 undefined，前端顯示「沒有待辦項目」。

**原因**：呼叫 `redisSet(key, JSON.stringify(payload))` 時，value 已是字串，但 function 內部又包了一次 `JSON.stringify(value)`，導致存進 Redis 的是 double-stringified 字串。

**修正**：`redisSet` 判斷 value 型別，字串直接傳、物件才 stringify：
```javascript
async function redisSet(key, value) {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  const r = await fetch(`${REDIS_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'text/plain' },
    body
  });
  return r.json();
}
```

### 陷阱 2：Upstash GET 回傳 byte array
**症狀**：`data.result` 是數字陣列（byte array）而非字串。

**修正**：`redisGet` 處理 byte array：
```javascript
async function redisGet(key) {
  const r = await fetch(`${REDIS_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
  });
  const data = await r.json();
  let val = data.result;
  if (Array.isArray(val)) {
    val = new TextDecoder().decode(new Uint8Array(val));
  }
  return val;
}
```

### 驗證方式
每次部署後，先 POST 測試資料再刷新頁面：
```bash
curl -s -X POST https://your-app.vercel.app/api/push \
  -H "Content-Type: application/json" \
  -d '{"test":true,"items":[{"id":"t","type":"urgent","title":"測試","date":"2026-01-01","summary":"test","todos":[],"source_file":"t.md"}],"stats":{"urgent":1,"pending":0,"total":1,"done":0},"priority_action":{"title":"測試","reason":"test"}}'
# 再 GET 確認回傳正確 JSON（不是字串）
curl -s https://your-app.vercel.app/api/push | python3 -m json.tool | head -5
```

## Cron 設定
```
# 每天 08:00 自動推送
0 8 * * *
```

## 環境變數
| 變數 | 說明 |
|------|------|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL（Vercel 環境變數） |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token（Vercel 環境變數） |
| `HERMES_SECRET` | 推送密鑰，選填 |

## 輸出範例
```
✅ 指揮中心已更新 — 完成 Telegram routing 端到端測試
```
