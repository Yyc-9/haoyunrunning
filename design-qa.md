# Design QA

## Source visual truth

- 使用者提供的 Logo 素材：`/Users/yangyichen/Downloads/logo`
- 本日對照素材（週日紫色）：`/Users/yangyichen/Desktop/桌面归档/网站与项目/好运网站/public/brand/weekday-logos/sunday-purple.png`
- 七日規則：週一紅、週二橙、週三黃、週四綠、週五青、週六藍、週日紫；依台灣時間自動切換。

## Implementation evidence

- 桌面首頁：`/private/tmp/haoyun-weekday-logo-desktop.png`
- 手機首頁：`/private/tmp/haoyun-weekday-logo-mobile-full.png`
- 來源／桌面／手機合併比較：`/private/tmp/haoyun-weekday-logo-comparison.jpg`

## Viewports and states

- 桌面：1440 × 900，首頁頂部、未捲動狀態。
- 手機：390 × 844，首頁頂部、未展開選單狀態。
- 日期狀態：2026-07-19，台灣時間週日；預期使用紫色 Logo。

## Full-view comparison evidence

- 桌面與手機導覽列都顯示相同的紫色週日 Logo，圖像沒有拉伸、裁切或透明背景光暈。
- 桌面 Logo 為 38 × 38 px，手機 Logo 為 34 × 34 px，沿用原導覽列尺寸與圓框，不改變選單密度。
- 手機頁面 `scrollWidth` 與 `clientWidth` 均為 390 px，沒有因新圖造成水平溢出。

## Focused region comparison evidence

- `haoyun-weekday-logo-comparison.jpg` 將原始紫色素材、桌面導覽與手機導覽放在同一張圖中比較。
- 馬蹄鐵輪廓、中文品牌字樣、紫色色值與白色透明區域均與來源一致；僅依既有圓形容器等比縮放。

## Required fidelity surfaces

- 字體與排版：導覽列品牌名稱、字重、行高與原網站一致，新 Logo 不改動文字排版。
- 間距與節奏：維持既有 36/40 px Logo 容器及品牌名稱間距，桌面與手機均未跳位。
- 色彩與視覺標記：本日使用週日紫色；七張素材依指定的紅橙黃綠青藍紫順序建立固定對應。
- 圖像品質：來源 PNG 以透明背景等比縮放至 512 × 512，沒有重新描繪或使用替代圖。
- 文案：僅新增繁體中文的星期與顏色說明，公開介面沒有新增簡體字。

## Findings

- 沒有剩餘 P0、P1 或 P2 問題。
- P3：開發環境仍會針對頁尾既有 `/goodluck-logo-nav.jpg` 顯示一則 LCP 警告，與本次左上角星期 Logo 無關，也不影響顯示或切換。

## Interaction and accessibility checks

- `data-weekday-logo="Sun"`、圖片來源 `sunday-purple.png`、提示文字「週日紫色 Logo」三項狀態一致。
- 2026-07-20 至 2026-07-26 的日期測試依序輸出 Mon、Tue、Wed、Thu、Fri、Sat、Sun。
- 切換排程使用台灣時間，頁面持續開啟時會在下一個台灣零點重新計算，不需要使用者刷新。
- 圖片保留「好運跑班 Logo」替代文字；桌面與手機均可被無障礙樹辨識。
- 瀏覽器沒有 console error。

## Comparison history

- Pass 1：原始透明 PNG 直接轉 RGB 時透明區域被誤顯示為實心色塊。
- Fix：改以白底 alpha composite 方式建立來源對照圖，並以原始透明 PNG 實際置入導覽列。
- Post-fix evidence：`/private/tmp/haoyun-weekday-logo-comparison.jpg`，來源、桌面與手機三者輪廓及透明區域一致。

## Final result

final result: passed

---

# 關於我們與學員見證圖片卡片 QA

## 檢查範圍

- 視覺來源：`/Users/yangyichen/Downloads/網站視覺圖`
- 實作頁面：`/about`、`/testimonials`
- 比對圖：
  - `/private/tmp/about-design-comparison.jpg`
  - `/private/tmp/testimonials-design-comparison.jpg`
- 響應式尺寸：桌面預設視窗、手機 390 × 844

## 驗收結果

| 項目 | 結果 | 說明 |
| --- | --- | --- |
| 既有版面與內容順序 | 通過 | 保留原有區塊、標題、文案與導覽，只替換不可點擊卡片的視覺呈現。 |
| 圖片選擇與裁切 | 通過 | 依品牌理念、服務重點與學員成長主題選用實拍照片，主體未被關鍵文字遮擋。 |
| 文字可讀性 | 通過 | 使用一致的半透明黑色遮罩、白字與固定內距；桌面與手機皆可清楚閱讀。 |
| 點擊暗示 | 通過 | 圖片卡片維持靜態 `article`，沒有 hover 位移、箭頭或按鈕樣式。 |
| 桌面版 | 通過 | 三欄對齊、卡片高度一致，沒有水平溢出。 |
| 手機版 | 通過 | 單欄排列，卡片寬度 343px，頁面寬度 375px，沒有水平溢出。 |
| 後台維護 | 通過 | 「各頁主視覺」新增可折疊的 6 張關於我們卡片底圖與 3 張學員見證卡片底圖管理。 |
| 繁體中文 | 通過 | 新增公開與後台文案均使用繁體中文。 |

## 最終結論

通過。實作符合現有網站設計語言，照片底圖與文字層級穩定，桌面及手機版皆可交付。
