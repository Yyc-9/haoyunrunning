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
