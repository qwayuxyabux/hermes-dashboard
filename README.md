# Hermes 指揮中心

> Hermes 自動分析 action_inbox → 推送 → 你打開網頁就是最新狀態

## 架構

```
action_inbox/*.md
      ↓ (08:00 cron)
   Hermes
      ↓ (Claude API 分析)
   Vercel KV
      ↓ (網頁讀取)
  指揮中心網頁
```

## 部署步驟（你做）

### 1. 建立 GitHub Repo
```bash
git init hermes-dashboard
cd hermes-dashboard
# 把這些檔案放進去
git add .
git commit -m "init: hermes command center"
gh repo create hermes-dashboard --public --source=. --push
```

### 2. 部署到 Vercel
1. 前往 https://vercel.com/new
2. Import 剛剛建的 GitHub repo
3. Framework Preset 選 **Other**
4. 點 Deploy

### 3. 開啟 Vercel KV
1. Vercel 專案頁面 → Storage → Create Database → KV
2. 建立後點 Connect to Project → 選你的專案
3. 環境變數會自動注入（`KV_URL`、`KV_REST_API_URL` 等）

### 4. 設定環境變數（選填）
Vercel 專案 → Settings → Environment Variables：
```
HERMES_SECRET=你自己設一個密鑰（英數字即可）
```

### 5. 把 SKILL 放進 Hermes
```bash
cp SKILL_push-dashboard.md ~/hermes/skills/push-dashboard/SKILL.md
```

把 `SKILL.md` 裡的 `DASHBOARD_URL` 換成你的 Vercel 網址。

### 6. 測試一次
```bash
# 在 Hermes 裡手動觸發
hermes skill push-dashboard
```

打開你的 Vercel 網址，應該看到資料了。

### 7. 設定 Cron（自動每天 08:00）
已在 `SKILL_push-dashboard.md` 裡有 cron 指令。

---

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `index.html` | 指揮中心網頁（自動讀取 Vercel KV） |
| `api/push.js` | Vercel Edge Function（接收推送 / 提供讀取） |
| `vercel.json` | Vercel 設定 |
| `SKILL_push-dashboard.md` | Hermes SKILL（分析 + 推送邏輯） |
