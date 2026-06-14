# push-dashboard SKILL
# Hermes 讀取 action_inbox → 分析 → 推送到指揮中心

## 觸發條件
- 每天 08:00 自動執行
- 手動指令：`push dashboard` / `推送儀表板` / `更新指揮中心`

## 執行步驟

### Step 1：讀取所有 action_inbox 檔案
```bash
find ~/Library/Mobile\ Documents/com~apple~CloudDocs/AI_WORKSPACE/00_TO_SORT/action_inbox -name "*.md" | sort
```

把所有 .md 內容合併成一個字串，檔案之間用 `---` 分隔，每個檔案前加 `# 檔案: {filename}` 標頭。

### Step 2：呼叫 Claude API 分析
用 `execute_code` 或 `requests`，POST 到 Anthropic API：

```python
import anthropic, json, os, glob

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# 讀取所有 .md
inbox_path = os.path.expanduser(
    "~/Library/Mobile Documents/com~apple~CloudDocs/AI_WORKSPACE/00_TO_SORT/action_inbox"
)
files = sorted(glob.glob(os.path.join(inbox_path, "*.md")))
content = ""
for f in files:
    filename = os.path.basename(f)
    with open(f, "r", encoding="utf-8") as fh:
        content += f"\n# 檔案: {filename}\n" + fh.read() + "\n\n---\n\n"

SYSTEM = """你是幫助ADHD使用者快速理解AI工作報告的助理。
把多份 .md 報告翻譯成白話，找出真正重要的事情。
輸出嚴格的 JSON，不要任何其他文字：

{
  "priority_action": {
    "title": "現在最該做的一件事（15字以內，白話）",
    "reason": "為什麼這件最重要（20字以內）"
  },
  "stats": {
    "urgent": 0,
    "pending": 0,
    "total": 0,
    "done": 0
  },
  "items": [
    {
      "id": "唯一ID",
      "type": "urgent|pending|info|done",
      "title": "這份報告在說什麼（白話，20字以內）",
      "date": "YYYY-MM-DD",
      "summary": "2-3句白話，30秒內能懂",
      "next_step": "下一個最小行動（可選）",
      "todos": [
        { "text": "待辦（白話）", "done": false }
      ],
      "source_file": "原始檔名"
    }
  ]
}

排序：urgent → pending → info → done
type 判斷：urgent=需人類決策, pending=進行中有loose end, done=全完成, info=只是通知"""

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=3000,
    system=SYSTEM,
    messages=[{"role": "user", "content": f"以下是 action_inbox 報告：\n\n{content}"}]
)

result = json.loads(response.content[0].text.strip())
```

### Step 3：POST 到指揮中心 API
```python
import requests as req

DASHBOARD_URL = "https://your-app.vercel.app/api/push"  # ← 部署後換成真實網址
HERMES_SECRET = os.environ.get("HERMES_SECRET", "")  # 可選，留空也行

headers = {"Content-Type": "application/json"}
if HERMES_SECRET:
    headers["Authorization"] = f"Bearer {HERMES_SECRET}"

resp = req.post(DASHBOARD_URL, json=result, headers=headers, timeout=10)

if resp.status_code == 200:
    print(f"✅ 指揮中心已更新 — {result['priority_action']['title']}")
else:
    print(f"❌ 推送失敗：{resp.status_code} {resp.text}")
```

## Cron 設定
```
# 每天 08:00 自動推送
0 8 * * * cd /path/to/hermes && python push_dashboard.py
```

## 環境變數
| 變數 | 說明 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API Key（已設定） |
| `HERMES_SECRET` | 推送密鑰，選填，跟 Vercel 環境變數同步 |
| `DASHBOARD_URL` | 你的 Vercel 網址 + `/api/push` |

## 輸出範例
```
✅ 指揮中心已更新 — 完成 Telegram routing 端到端測試
```
