# 報名通知與補件流程

本次將已確認的互動流程實作於網站；使用既有 Supabase、Resend，未新增網站執行依賴。

## 操作

- 登入後於網站導覽、手機精簡頁首和手機管理後台顯示小鈴鐺。每 45 秒、回到頁面及完成操作後更新。
- 新報名與學生補交資料會提醒管理員和獲授權財務。歷史未完成且未封存的課程報名也會建立待辦通知。
- 財務在銀行對帳入口或報名詳情進入 `/notifications?view=staff`，填寫給學生的說明及獨立內部備註。非管理員財務仍須先解鎖原有財務密碼。
- 補件要求、狀態及站內通知同一交易保存。郵件另外發送，失敗不撤銷站內通知；畫面列出寄送狀態並允許人工重試。
- 學生點擊通知或郵件會進入原報名 ID。可直接查看原報名收款資訊、填寫匯款日期、後五碼與補充說明。提交後回到待人工核對，不另建報名。
- 每個帳號的已讀狀態獨立；已讀不等於已核對。補件不會自行確認入帳，仍沿用原銀行核對及管理員確認流程。
- 已核准與已封存報名禁止補件變更。封存季度不能重寄提醒。內部備註不進入學生 API、通知或郵件。

## 郵件

使用既有 `RESEND_API_KEY`、`ENROLLMENT_EMAIL_FROM`（或 `RESEND_FROM_EMAIL`）、`NEXT_PUBLIC_SITE_URL`。2026-09-20 推送前已透過 Vercel 的變數名稱清單確認正式環境也未設定發信金鑰及寄件人；未讀取或顯示任何密鑰值。站內通知可獨立運作，郵件會明確標示為尚未設定，不能視為已寄出。

每筆要求保存固定 Resend idempotency key 和不可變郵件內容；正在寄送時避免並行重試。首次嘗試超過 23 小時的未確認郵件，停止重送並提示人工確認。`sent` 代表郵件服務接受，不能當作收件匣送達證明。沒有加入排程、自動補寄或郵件到達追蹤。

## 驗證

- 原有 135 項測試通過。
- `scripts/verify-enrollment-notifications.mjs`：17 項隔離 PostgreSQL 檢查，涵蓋通知、權限、已讀、補件、重試、封存及原報名資料保留。使用暫存目錄的 PGlite，不向正式資料庫寫入。
- `scripts/verify-notification-api.mjs`：10 項 API／郵件適配器檢查，涵蓋匿名、未驗證、財務解鎖、內部資料隔離、郵件失敗、重試及原季度收款資訊。郵件全部模擬。
- `scripts/verify-notification-ui.mjs`：正式頁面程式在隔離 Next 建置中，透過合成登入與 API 回應檢查桌面、375px 手機通知、已讀、財務補件、學生補交、重新整理及回覆紀錄；不建立新的示範頁。
- TypeScript、繁體檢查、ESLint、獨立 production build。隔離建置不帶正式 Supabase 金鑰。

執行方式：

```sh
node scripts/verify-notification-api.mjs
PGLITE_MODULE=/path/to/temporary/node_modules/@electric-sql/pglite/dist/index.js node scripts/verify-enrollment-notifications.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs NOTIFICATION_QA_BASE=http://127.0.0.1:3201 node scripts/verify-notification-ui.mjs
```

UI 驗證使用的隔離建置公開設定為 `NEXT_PUBLIC_SUPABASE_URL=https://notification-qa.invalid`、`NEXT_PUBLIC_SUPABASE_ANON_KEY=isolated-notification-qa`，不要拿正式伺服器執行。

## 上線順序與目前界線

1. 先審查並套用 `supabase/migrations/20260920064910_enrollment_notifications.sql`。部署新程式前必須存在新欄位、表和 RPC。若 remote 已有較新的 migration，先檢查 migration 列表及待套用清單，避免把其他未完成 migration 一起推上去。
2. 確認正式環境沿用的發信金鑰、已驗證寄件人與正式網址。
3. 部署網站；用隔離報名和受控信箱驗證真實登入、各角色操作與實際收信，再清理驗證資料。

初次實作驗證時尚未發布。使用者隨後授權推送，已於 2026-09-20 套用正式 migration，遠端版本為 `20260920074321_enrollment_notifications`，對應本地 `20260920064910_enrollment_notifications.sql`。已驗證通知查詢、RLS 及服務端專用權限。部署結果以 Vercel 實際狀態為準；沒有向真實學生寄信，上述模擬驗證不能替代郵件送達驗收。

安全檢查中的 [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) 是通知表刻意採用的服務端專用存取設計，匿名與登入瀏覽器角色皆無直接存取權。現有的 [leaked password protection 提醒](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) 屬於專案原有 Auth 設定，本次沒有更改。

若要回退程式，先保留新增資料表與欄位，以免丟失通知和補件紀錄；不要以刪除正式資料作為回退方式。
