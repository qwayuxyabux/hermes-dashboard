# Plan: hermes-dashboard 完善與推送

## Objective
完善 hermes-dashboard 專案，確保 Vercel 部署的 API 端點完整、README 更新、所有程式碼改動已 push 到 GitHub。

## Scope
- 只修改 `~/Library/Mobile Documents/com~apple~CloudDocs/AI_WORKSPACE/hermes-dashboard/` 內的檔案
- 不修改 Vercel 設定（已運作）
- 不修改 Upstash Redis 設定（已運作）
- 不新增外部服務

## Tasks

### Task 1: 驗證 API 端點完整性
- 讀取 `api/push.js`，確認 GET 和 POST 端點都實作完整
- 確認 CORS header 正確
- 確認錯誤處理完整（try/catch）
- 確認沒有 double JSON.stringify 問題

### Task 2: 更新 README.md
- 確認 README 包含：專案說明、API 端點文件、本地開發方式、部署方式
- 確認 README 與目前程式碼一致

### Task 3: 確認 .gitignore 完整
- 確認 `.vercel` 在 .gitignore 內
- 確認沒有敏感檔案（.env, secrets）會被 commit

### Task 4: 提交並推送
- `git add -A`
- `git commit -m "chore: finalize dashboard for production"`
- `git push`
- 確認 `git status` 顯示 clean working tree

## Acceptance Criteria
1. `api/push.js` GET/POST 端點完整且無 bug
2. README.md 包含完整文件
3. .gitignore 正確
4. `git status` 顯示 clean，所有改動已 push
5. Vercel 自動部署後 API 可正常回應

## Stop Conditions
- 發現敏感檔案（.env, token, key）在 repo 內 → 停止並回報
- 發現需要修改 Vercel/Upstash 設定 → 停止並回報
- push 失敗 → 停止並回報錯誤
