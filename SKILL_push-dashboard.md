# push-dashboard SKILL
# Hermes 讀取 action_inbox → 分析 → 推送到指揮中心

## 觸發條件
- 每次寫入 action_inbox/ 新檔案後自動執行
- 手動指令：`push dashboard` / `推送儀表板` / `更新指揮中心`

## 核心原則
1. **可以自動做的，Hermes 直接做，不要問人**
2. **需要人類決策的，給 2-3 個選項讓人選**
3. **人選完後，Hermes 直接執行，不要再確認**
4. **只有真正需要人類判斷的才打斷**

## Step 1：讀取 action_inbox

```bash
find ~/Library/Mobile\ Documents/com~apple~CloudDocs/AI_WORKSPACE/00_TO_SORT/action_inbox -name "*.md" | sort
```

## Step 2：分析（用你的主控模型，不用 Claude API）

分析所有 .md 內容，輸出嚴格 JSON：

```json
{
  "pushed_at": "ISO時間",
  "priority_action": {
    "title": "現在最該做的一件事（白話，15字以內）",
    "reason": "為什麼（15字以內）"
  },
  "stats": {
    "urgent": 0,
    "pending": 0,
    "total": 0,
    "done": 0
  },
  "items": [
    {
      "id": "唯一ID（用檔名簡化）",
      "type": "decision | auto_done | pending | info",
      "title": "白話標題（不准出現技術術語）",
      "date": "YYYY-MM-DD",
      "summary": "這份報告在說什麼，用跟朋友聊天的語氣說（2句話以內）",
      "next_step": "具體到可以直接做的動作。不是'完成測試'而是'打開終端機輸入 hermes test routing'",
      "source_file": "原始檔名",
      "todos": [
        { "text": "待辦（白話）", "done": false }
      ],
      "options": null
    }
  ]
}
```

### type 判斷邏輯

| type | 什麼時候用 | 儀表板呈現 |
|------|-----------|-----------|
| `decision` | 有多條路可以走，必須人類選 | 顯示 2-3 個選項按鈕 |
| `auto_done` | Hermes 可以自己做 / 已經做完的 | 灰色，標記完成 |
| `pending` | 正在進行，有具體下一步 | 橘色，顯示下一步動作 |
| `info` | 只是通知，不需要任何行動 | 藍色，最低優先 |

### decision 類型的 options 格式

```json
{
  "options": [
    {
      "id": "opt-a",
      "label": "選項名稱（5字以內）",
      "description": "這個選項會怎樣（白話，20字以內）",
      "pros": "好處（10字以內）",
      "cons": "壞處（10字以內）"
    }
  ]
}
```

### 白話翻譯規則（最重要）

**禁止出現的詞：**
cron, sync, script, routing, endpoint, API, deploy, commit, push, pull,
terminal, SSH, config, webhook, token, schema, database, migration

**替代方式：**
- cron job → 定時自動任務
- sync script → 同步程式
- routing → 訊息分流
- endpoint → 網址
- deploy → 上線
- commit/push → 更新到 GitHub
- terminal → 終端機
- SSH → 遠端連線到桌電
- config → 設定
- webhook → 自動通知
- token → 密鑰
- schema → 欄位結構

**next_step 必須包含：**
1. 在哪裡做（打開什麼 app / 網頁 / 終端機）
2. 做什麼動作（輸入什麼 / 點什麼 / 看什麼）
3. 預估花多少時間

## Step 3：POST 到指揮中心

```bash
curl -X POST https://hermes-dashboard-jade.vercel.app/api/push \
  -H "Content-Type: application/json" \
  -d '上面的 JSON'
```

## Step 4：處理使用者的決策回覆

定期檢查（每 5 分鐘，或綁在現有的 mailbox watcher 裡）：

```bash
curl -s https://hermes-dashboard-jade.vercel.app/api/decisions
```

如果有未處理的決策：
1. 讀取使用者選了什麼
2. 直接執行對應的行動
3. 執行完後重新推送一次 dashboard
4. 不要回去問使用者確認
