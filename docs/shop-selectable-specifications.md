# 商城可選規格

每組規格只能選一項，例如「顏色：黑色、白色」「包裝：單件、套裝」。後台可用逗號、頓號或換行分隔，斜線不會拆開。規格保留在獨立欄位，說明文字放商品簡介。完全重複的舊尺碼／款式列沿用原選擇器，不重複顯示。

尺碼、款式和規格組合不同，購物車會分開列出。所有組合仍使用商品的售價與總庫存；訂單價格以資料庫為準。規格快照儲存在 `shop_order_items.selected_specifications`，後續編輯商品不會改寫舊訂單。舊購物車缺少或含失效規格時必須重新選擇。

## 發布順序

1. 先套用 `supabase/migrations/20260905001751_shop_selectable_specifications.sql`，包含新欄位與 `create_shop_order_with_specs` RPC。新專案在基礎 `schema.sql`／`shop-orders.sql` 之後也必須套用此遷移。
2. 確認欄位與新 RPC 存在，再發布網站。新 API 不會退回舊 RPC，以免靜默遺失規格。
3. 正式商品可維持原內容；管理員需把要提供的規格選項填入「商品規格」。不要將示例顏色／包裝寫入正式資料。
4. 若回退網站，新欄位與 RPC 可保留；不要刪除已記錄的規格快照。

## 驗證

- `npm test`、`npm run lint`、`npm run build`。
- 隔離 PostgreSQL 測試：安裝臨時 `@electric-sql/pglite@0.5.8`，以 `PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node scripts/test-shop-specifications-sql.mjs` 執行。工具不讀取正式資料庫設定。
- 瀏覽器使用假商品與攔截訂單請求，驗證選擇、重新整理、不同規格分列、總庫存上限、結帳摘要、舊購物車提示及後台滾動。
- 正式發布前需另外確認已套用的遷移、平台安全建議及登入管理員畫面；本地測試不代表線上資料庫已更新。

資料庫使用 security invoker，僅 service_role 可執行下單函式；規格驗證和庫存扣減在同一交易內。依據 [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)。
