# 第三方登入啟用

2026-09-21 檢查：正式專案目前僅 Google 啟用；Microsoft、Apple、Facebook 尚未啟用。

網站已支援上述四種登入，Google 排第一。`/api/auth/providers` 只傳回 Supabase 已啟用的提供者，不傳回金鑰或完整設定。完成平台配置後，約 1–2 分鐘內自動顯示按鈕，無需再部署。不要只切換 enabled；先完成對應平台應用設定和回呼網址，再驗證實際登入。

共用 OAuth callback：`https://vmnbthmssiizbsvzeahz.supabase.co/auth/v1/callback`

## Microsoft

依 [Supabase 官方 Microsoft 指引](https://supabase.com/docs/guides/auth/social-login/auth-azure) 在 Microsoft Entra 建立 OAuth 應用。若需涵蓋 Outlook/Hotmail 和企業、學校帳戶，應選擇支援個人 Microsoft 帳戶及組織帳戶的設定。

1. 將上方 callback 加入 Web redirect URI。
2. 依官方指引設定 email 與 xms_edov claims。
3. 將應用 client ID 和 secret value 直接填入 Supabase 的 Azure provider；不要把 secret 貼到聊天或提交到 Git。
4. 啟用 provider。前端使用 `azure` 並要求 `email` scope。
5. 分別以預期帳戶類型驗證登入、回到原頁，以及重新載入後的會員資料。

## Apple / Facebook

分別在平台建立對應網站登入應用，設定同一 callback，將平台要求的應用識別資訊及憑證直接存到 Supabase Auth providers 後再啟用。網站已接上 `apple` 和 `facebook` provider。啟用後仍需使用真實帳戶驗證授權與回站流程。

網站測試過的部分：Google 優先排列、未啟用 provider 不顯示、Microsoft email scope、注册不要求性別/PB，以及個人資料補填與儲存。未有各平台有效配置前，不應宣稱其他第三方登入已可使用。
