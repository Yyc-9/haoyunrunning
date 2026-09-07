# 季度管理與活動排版修正

資料庫保護已於 2026-09-08（UTC+8）透過 Supabase migration 安裝：`20260907164330_safe_delete_empty_course_season`。未刪除或修改任何正式季度資料。

## 上線順序

1. 正式資料庫已安裝 `supabase/operations/delete-empty-course-season.sql` 對應函式與稽核類型。CLI 本機啟動失敗，改由 Supabase MCP 建立並記錄遠端 migration。此檔保留為可重複執行的部署 SQL。
2. 確認 `delete_empty_course_season(uuid, uuid)` 僅授權 service_role；anon/authenticated 不可呼叫。
3. 再部署網站程式。若 SQL 尚未安裝，API 會拒絕刪除並提示資料庫待更新，不使用不安全的退路。
4. 確認正式後台預設進入招生中的季度，仍能手動查歷史季度。不要為了測試刪除既有營運資料。

## 刪除範圍

只刪除非目前前台、非招生中、非進行中且無營運紀錄的季度與其課程設定。
報名/收款、學員點名、扣堂、停課、補課（含目標班級）、教練排班/簽到/請假，以及已執行的同步均受保護。
檢查、快照稽核及刪除在同一交易中執行，鎖定季度、課程與同步設定；任何失敗均回滾。
刪除稽核保留原季度及課程設定快照。

## 驗證

- `npm test`
- `npx tsc --noEmit`
- `PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/verify-season-deletion.mjs`
  使用隔離 PGlite（本次 0.3.14）假資料驗證，不連正式資料庫。
- 活動編輯器目前為純文字；保留換行、空行和段落縮排，不新增 HTML 或富文字權限。

## 安全檢查備註

正式環境已確認 anon/authenticated 不可執行刪除函式，service_role 可以。Supabase 安全檢查另提示 Auth 尚未啟用外洩密碼保護，本次未更動驗證設定：[官方說明](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)。其餘 INFO 為伺服器管理表啟用 RLS 且未開放客戶端政策，未為此放寬權限。
