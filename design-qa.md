# Design QA

## Source visual truth

- 使用者提供的 Logo 素材：`/Users/yangyichen/Downloads/好运网站/logo`
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

# 榮耀徽章參考圖圖片替換 QA（2026-08-06）

## 檢查範圍

- 參考圖：`/Users/yangyichen/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/yangyichen1999_5302/temp/RWTemp/2026-08/9e20f478899dc29eb19741386f9343c8/6a53a2dfe3c70a9f93c2aa35c1693cc7.jpg`
- 實作頁面：`/achievements`
- 保留範圍：既有文字、資訊架構、申請流程、個人帳戶入口與手機橫向滑動互動。

## 圖片對應

| 區塊 | 圖片 |
| --- | --- |
| 首屏全系列 | `collection-cards.jpg` |
| THE ORIGIN | `lifestyle-sub3.jpg` |
| 四款榮耀徽章 | SUB 3=`collection-full-sub3.jpg`、SUB 4=`collection-full-sub4.jpg`、SUB 100=`collection-half-sub2.jpg`、SUB 2=`collection-half-sub100.jpg` |
| BQ Pride | `bq-pride-feature.jpg` |
| MILESTONE CARDS | `full-sub3.jpg`、`full-sub4.jpg`、`half-sub100.jpg`、`full-sub2.jpg`、`bq-pride.jpg` |
| 申請方式旁實拍 | `badge-in-hand.jpg` |

## 驗收結果

| 項目 | 結果 | 說明 |
| --- | --- | --- |
| 參考圖映射 | 通過 | 黃框標示的圖片區域均改用對應的實拍素材，沒有生成或替換品牌徽章本體。 |
| 文字與功能 | 通過 | 只調整圖片來源與裁切方向，頁面文案、連結、滑動與申請說明未改動。 |
| 圖片裁切 | 通過 | 四款徽章使用大理石背景素材並固定靠左裁切，紀念卡改用深色布面實拍。 |
| 靜態版面 | 通過 | 圖片比例延續既有 `aspect-ratio` 與 `object-cover` 規則，沒有新增固定寬度或水平溢出來源。 |
| 最終瀏覽器比對 | 受阻 | 內置瀏覽器在重新載入本機預覽時被瀏覽器安全政策拒絕；未繞過權限，因此本輪不虛報最終截圖比對。 |

## Final result

final result: blocked（僅最終瀏覽器截圖比對受阻；程式、素材映射與建置檢查照常完成）

---

# 關於我們區塊刪除範圍校正 QA

## 檢查範圍

- 使用者標註圖：`/var/folders/zg/66z7x42d0dgdx4zbv_kk8wfh0000gn/T/codex-clipboard-6f93262b-ee74-4e6f-8b99-3f95fb350847.png`
- 桌面實作：`/private/tmp/about-corrected-story-desktop-2.png`
- 手機首屏：`/private/tmp/about-corrected-mobile-top-3.png`
- 手機品牌故事：`/private/tmp/about-corrected-mobile-story.png`
- 合併比對：`/private/tmp/about-correction-comparison.png`

## 驗收結果

| 項目 | 結果 | 說明 |
| --- | --- | --- |
| 首屏三項理念 | 通過 | 恢復「專注速度能力與跑步經濟性、建立穩固的訓練基礎、每位跑者都值得被看見」三項內容。 |
| 品牌故事三欄 | 通過 | 僅移除「我們想讓更多人，真正喜歡上跑步」圖片區底部的三欄，保留背景、標題與介紹。 |
| 內容中心 | 通過 | 恢復首屏三項理念編輯欄位，移除已不在前台顯示的品牌故事三項支持重點。 |
| 桌面版 | 通過 | 品牌故事文字垂直置中，移除三欄後沒有留下不自然空白。 |
| 手機版 | 通過 | 首屏三項理念完整顯示，品牌故事不再出現三欄，頁面沒有橫向溢出。 |
| 視覺一致性 | 通過 | 保留既有背景圖、遮罩、字級與頁面順序，只校正指定內容範圍。 |

## Final result

final result: passed

---

# 關於我們首屏精簡、教練頭像入口與商店主視覺 QA（2026-07-26）

## 調整目標

- 移除「關於我們」首屏底部的三項理念文字帶，保留首屏標題及跑道背景。
- 教練工作台不顯示個人頭像、不提供教練自行上傳入口；正式教練照片仍由超級管理員統一維護。
- 商店改用指定的 `商店圖-02.jpg`，保留內容中心日後更換商店主視覺的能力。

## 比對證據

- 使用者標記的移除區域：`/var/folders/zg/66z7x42d0dgdx4zbv_kk8wfh0000gn/T/codex-clipboard-cac01200-823c-4317-bc9d-00ef5a57d805.png`
- 移除前後合併比較：`/private/tmp/about-strip-removal-comparison.png`
- 關於我們桌面：`/private/tmp/about-without-philosophy-strip-desktop.png`
- 關於我們手機：`/private/tmp/about-without-philosophy-strip-mobile.png`
- 商店來源與桌面實作合併比較：`/private/tmp/shop-hero-02-comparison.jpg`
- 商店桌面：`/private/tmp/shop-hero-02-desktop-reload.png`
- 商店手機：`/private/tmp/shop-hero-02-mobile.png`

## 驗收結果

| 項目 | 結果 | 說明 |
| --- | --- | --- |
| 關於我們首屏 | 通過 | 指定三項文字帶完整移除；桌面與手機都只保留首屏主標與背景。 |
| 內容中心一致性 | 通過 | 不再顯示已從前台移除的「三項訓練理念」假控制項。 |
| 教練工作台 | 通過 | 移除頭像圓框、更換頭像按鈕及子導航入口；舊網址會返回工作台。 |
| 上傳權限 | 通過 | 教練資料更新接口拒絕自行上傳；網站媒體上傳接口只允許超級管理員。 |
| 商店主視覺 | 通過 | 指定圖片已複製至公開資源並以深色遮罩確保白色文案可讀。 |
| 商店手機版 | 通過 | 375px 實際內容寬度與捲動寬度相同，沒有橫向溢出；主要圖案與文字同時可辨識。 |
| 商店桌面版 | 通過 | 1425px 視窗中主視覺高度 396px，圖片比例、焦點與左側文字區穩定。 |

## Final result

final result: passed

---

# 關於我們品牌敘事嵌入式底圖 QA

## 調整目標

- 將「我們想讓更多人，真正喜歡上跑步」由左右分欄改為單一全寬圖片區。
- 原本的標題、介紹文字與三項理念直接疊加在同一張動態主圖上。
- 保留內容中心的「關於我們主圖」設定，管理員更換圖片後仍會同步更新。

## 比對證據

- 修改前參考：`/private/var/folders/zg/66z7x42d0dgdx4zbv_kk8wfh0000gn/T/chronicle/screen_recording/1min/2026-07-23T13-07-21.113091+00-00-display-2/frame-000027-2026-07-23T13-08-00Z.jpg`
- 修改後桌面：`/private/tmp/about-embedded-after-lower-desktop-complete.png`
- 修改後手機：`/private/tmp/about-embedded-after-mobile-complete.png`

## 驗收結果

| 項目 | 結果 | 說明 |
| --- | --- | --- |
| 嵌入式版面 | 通過 | 移除左右分欄、圖片圓角與外框，內容直接融入全寬實拍背景。 |
| 文字層級 | 通過 | 眉題、主標、介紹與三項理念維持清楚層級，固定深色遮罩確保可讀性。 |
| 桌面版 | 通過 | 主文案靠左集中，三項理念於底部橫向排列，與頁首主視覺保持一致節奏。 |
| 手機版 | 通過 | 內容改為單欄堆疊，三項理念依序排列，頁面寬度 375px 且沒有水平溢出。 |
| 動態內容 | 通過 | 繼續使用 `pageMedia.aboutHero`、`about` 文案與理念資料，沒有改成靜態內容。 |
| 繁體中文 | 通過 | 公開文字維持繁體中文。 |

## Final result

final result: passed

---

# 官網五頁 SAMPLE 還原 QA

## 檢查範圍

- 視覺來源：`/Users/yangyichen/Downloads/好運官網照片素材`
- 實作頁面：首頁課程預覽、`/about`、`/courses`、`/team`、`/shop`
- 桌面尺寸：1440 × 1000
- 手機尺寸：390 × 844

## 參考圖與實作證據

| 頁面 | 參考圖 | 實作截圖 |
| --- | --- | --- |
| 關於我們 | `design-references/hero-2026/about-sample.jpg` | `/private/tmp/about-desktop-viewport-qa.png` |
| 商店 | `design-references/hero-2026/shop-sample.jpg` | `/private/tmp/shop-desktop-viewport-qa2.png` |
| 首頁課程預覽 | `design-references/hero-2026/home-courses-sample.jpg` | `/private/tmp/home-courses-desktop-viewport-qa2.png` |
| 訓練日程 | `design-references/hero-2026/courses-sample.jpg` | `/private/tmp/courses-desktop-viewport-qa2.png` |
| 教練團隊 | `design-references/hero-2026/team-sample.jpg` | `/private/tmp/team-desktop-viewport-qa.png` |

手機實作證據：

- 關於我們：`/private/tmp/about-mobile-viewport-final.png`
- 訓練日程：`/private/tmp/courses-mobile-viewport-final.png`
- 教練團隊：`/private/tmp/team-mobile-viewport-final.png`
- 商店：`/private/tmp/shop-mobile-viewport-final2.png`
- 首頁課程預覽：`/private/tmp/home-courses-mobile-hero-final.png`

## 驗收結果

| 項目 | 結果 | 說明 |
| --- | --- | --- |
| 關於我們 Hero | 通過 | 以跑道實景建立全寬主視覺，還原英文眉題、品牌主標、雙語理念、三欄核心價值與白色事實卡。 |
| 商店 Hero | 通過 | 改為全寬橫幅並保留動態標題、說明與商品數量；搜尋、分類、排序、商品與購物車邏輯未改動。 |
| 首頁課程預覽 | 通過 | 以深色全寬主視覺承接課程標題與完整課表入口，下方繼續使用真實代表課程資料。 |
| 訓練日程 | 通過 | 還原深色主視覺與四步驟報名說明，既有篩選器、課表、常見問題及詳情導向均保留。 |
| 教練團隊 | 通過 | 使用指定背影合照方案，保留真實教練數量、卡片資料、照片焦點與後台編輯能力。 |
| 響應式 | 通過 | 五個頁面在 390px 手機視窗中皆無整頁水平溢出，文字、遮罩與按鈕保持可讀。 |
| 圖片交付 | 通過 | 實際公開背景已轉為 WebP 並存入 `public/site-visuals/hero-2026`，執行時不依賴 Downloads 絕對路徑。 |
| 支付素材邊界 | 通過 | QR 與匯款資訊圖片沒有複製至公開資源，也沒有加入任何公開頁面。 |
| 繁體中文 | 通過 | 新增公開文案皆使用繁體中文。 |

## Final result

final result: passed

---

# 榮耀徽章手機橫向滑動 QA

## 調整目標

- 桌面端維持現有徽章系列與紀念卡橫向排列。
- 手機端改為單排橫向滑動，避免圖片縮小成擁擠的兩欄或多行。
- 每次清楚呈現一張主要卡片，右側保留下一張卡片的局部，建立自然的滑動提示。

## 視覺來源與完成證據

- 來源：使用者提供的榮耀徽章桌面版與手機版頁面截圖。
- 徽章系列手機完成圖：`/private/tmp/achievements-mobile-series-after.png`
- 達標紀念卡手機完成圖：`/private/tmp/achievements-mobile-milestone-after.png`
- 測試尺寸：390 × 844。

## 驗收結果

| 項目 | 結果 | 說明 |
| --- | --- | --- |
| 徽章系列 | 通過 | 四款徽章在手機端為單排滑動，每張寬約 82vw，右側露出下一張。 |
| 達標紀念卡 | 通過 | 五張紀念卡在手機端為單排滑動，每張寬約 72vw。 |
| 滑動定位 | 通過 | 兩個區塊均使用橫向吸附與平滑捲動，並限制橫向回彈範圍。 |
| 操作提示 | 通過 | 手機端新增「左右滑動查看」提示；桌面端自動隱藏。 |
| 桌面版 | 通過 | 1280px 視窗仍維持原本 Grid 排列，區塊寬度與捲動寬度一致。 |
| 頁面寬度 | 通過 | 390px 測試時頁面 `scrollWidth` 與 `clientWidth` 均為 375px，沒有整頁橫向溢出。 |
| 視覺一致性 | 通過 | 保留原有黑、金、米白配色、卡片圓角、圖片比例與文字內容。 |
| 繁體中文 | 通過 | 新增提示文字使用繁體中文。 |

## Final result

final result: passed

---

# 關於我們與學員見證圖片卡片 QA

## 檢查範圍

- 視覺來源：`/Users/yangyichen/Downloads/好运网站/网站视觉图`
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

---

# 關於我們與學員見證整合式圖片橫幅 QA

## 調整目標

- 移除三張獨立卡片並排的視覺感。
- 關於我們改為兩列內容，每列只使用一張完整橫向圖片。
- 學員見證的三項成長重點整合至一張橫向圖片。
- 文字直接嵌入圖片區塊，不增加可點擊暗示、卡片邊框、陰影或漸層。

## 比對證據

- 修改前關於我們：`/private/tmp/about-cards-reference.png`
- 修改後第一列：`/private/tmp/about-bands-local.png`
- 修改後第二列：`/private/tmp/about-bands-second-local.png`
- 修改後學員見證：`/private/tmp/testimonials-band-local.png`
- 修改前後合併比較：`/private/tmp/about-bands-comparison.jpg`
- 手機版：`/private/tmp/about-bands-mobile.png`

## 驗收結果

| 項目 | 結果 | 說明 |
| --- | --- | --- |
| 關於我們第一列 | 通過 | 三項訓練理念共用一張實拍圖片，文字以三欄直接排列於圖片上。 |
| 關於我們第二列 | 通過 | 三項課程與社群支援共用一張實拍圖片，與第一列維持一致節奏。 |
| 學員見證 | 通過 | 三項學員成長重點整合至一張圖片，不再拆成三張卡片。 |
| 無卡片感 | 通過 | 移除圓角、外框、陰影與獨立卡片間距，只保留內容分隔線。 |
| 圖片與文字 | 通過 | 使用固定黑色遮罩維持對比，圖片主體與文字在桌面及手機均可辨識。 |
| 手機版 | 通過 | 三項內容改為同一張圖片內垂直排列，`scrollWidth` 與 `clientWidth` 均為 375px。 |
| 後台維護 | 通過 | 圖片管理由 9 張卡片底圖簡化為 3 張橫幅：關於我們兩張、學員見證一張。 |
| 繁體中文 | 通過 | 新增的公開與後台文案均使用繁體中文。 |

## Final result

final result: passed

---

# 首頁主視覺減少動態效果 QA（2026-09-03）

## 設計判斷

- 保留「跑道曲線＋真實訓練照片跑跡」作為首頁唯一的招牌互動，不增加第二套裝飾性動效。
- 首頁主視覺只負責傳達系統化訓練與陪伴感，近期活動與課程選擇仍由下方既有區塊承接。
- 系統開啟「減少動態效果」時，首屏內容立即呈現，滑鼠跑跡與操作提示保持停用。

## 發現與修正

- 修正前：Framer Motion 的 `initial` 依瀏覽器動態偏好分支，導致服務端與客戶端初始樣式不同，減少動態效果模式出現 React hydration mismatch。
- 修正後：所有環境共用相同初始樣式；只在轉場時間上套用動態偏好。一般桌面保留原有入場與跑跡互動，減少動態效果模式改為零秒轉場。

## 驗收結果

| 項目 | 結果 | 說明 |
| --- | --- | --- |
| 桌面版 | 通過 | 1440 × 1000，滑鼠移動後跑跡照片正常出現，頁面無水平溢出。 |
| 手機版 | 通過 | 390 × 844，`scrollWidth` 與 `clientWidth` 均為 390px；跑跡與滑鼠提示維持隱藏。 |
| 減少動態效果 | 通過 | 1440 × 1000，跑跡與提示隱藏，React hydration mismatch 已消失。 |
| 瀏覽器錯誤 | 通過 | 三種情境皆無頁面例外與失敗請求；只保留既有的 CSP report-only 瀏覽器提示。 |
| 專案檢查 | 通過 | 繁體中文檢查、44 項自動測試、ESLint 與 Next.js 正式建置全部通過。 |

## Final result

final result: passed

---

# 商城商品工作區：第一張設計驗收

Selected source visual truth: `/Users/yangyichen/.codex/generated_images/019f75f7-dfd2-7e23-a798-be167a8a51ac/exec-6265ace0-6900-485b-a78f-60cd55df7478.png`

Implementation: `http://localhost:3001/admin`, development-only in-memory preview of the production components. No live admin writes or deployments.

Artifact directory: `/Users/yangyichen/.codex/visualizations/2026/07/18/019f75f7-dfd2-7e23-a798-be167a8a51ac/shop-admin-option1/`

## Comparison state and normalization

- Source: 1487 × 1058 pixels. Final implementation: 1487 × 1058 CSS/pixel viewport, deviceScaleFactor 1.
- State: desktop, Traditional Chinese, first product selected, unsaved summary change, gallery and advanced settings collapsed.
- Full-view comparison: `comparison-full.png`, source on the left, implementation on the right, natural pixel density without stretching.
- Focused field comparison: `comparison-fields.png`, content and property columns, both opened together at 1:1 density.
- Final captures match the source pixel dimensions without resizing either image.
- Intentional product constraint: keep existing site navigation, real admin section names and identity. Do not implement the generated mock's invented order, discount or inventory navigation. This adds the existing site header above the work area; compare the product workspace regions separately.

## Comparison history

### Pass 1

- [P2] Product fields and media metadata are smaller than the selected visual. Input text is 14px versus approximately 16px in the source, creating noticeably longer line lengths. Product title hierarchy is also too weak.
  - Evidence: `desktop-final-pass1.png`, `comparison-fields-pass1.png` before the typography refinement.
  - Fix: inputs to 16px, field labels to 14px, title to 24px, product-list titles to 15px, media labels to 14px and statuses to 12px.
- Core composition matches: product list on the left, persistent editor actions above, introduction in the center, price/stock/sizes/media in the right rail, optional advanced details below.

### Pass 2

- Reopened `comparison-full.png` and `comparison-fields.png` after the typography changes. The 16px inputs now match the source's reading scale and paragraph wrapping; labels, titles and compact media metadata remain distinct and legible. The previous typography P2 is resolved.
- [P1, resolved] During this turn a parallel change to the shared crop component introduced a `next/image` runtime error: `fill` conflicts with the crop geometry's `style.width`. The second upload test exposed it; no product was submitted.
  - Minimal fix: retain the other task's geometry, portal and focus trap; use explicit image width/height and absolute positioning, and capture the trigger ref before effect cleanup.
  - Post-fix evidence: full local file selection, crop, create and delete flow passed again in `interaction-results.json`; added regression coverage prevents the fill/width conflict.
- Extra screenshots: `viewport-1366.png`, `viewport-1024.png`, `viewport-390.png`. No page-level horizontal overflow; save remains in the editor header while the long editor body scrolls.
- No remaining P0/P1/P2 findings in the scoped product workspace.

## Interaction evidence

`interaction-results.json` records browser verification of initial selection; search and empty state; status/low-stock filtering; cancelled and confirmed unsaved-change switching; standard/custom sizes and saved state; inventory validation; compact gallery removal; actual local image file selection and crop; creation and two-stage deletion; no horizontal overflow at 1366/1024/390px; reduced motion. Zero browser runtime/React console errors and zero admin API writes. The pre-existing CSP report-only `upgrade-insecure-requests` diagnostic is excluded from application error counts.

## Required fidelity surfaces

- Typography: initial P2 corrected and checked against the source in the final focused comparison; existing system/PingFang Chinese font stack retained.
- Spacing/layout: consistent list/editor/property hierarchy, fixed top save actions, restrained borders; intentional existing-header difference noted above.
- Colors/tokens: existing deep teal ink, teal selection, pale neutral surfaces, semantic green saved state and amber unsaved state.
- Image quality/assets: no persistent media preview by user request. Existing logo retained; Lucide icons already used in the repository match the source's outlined icon treatment. Actual crop dialog remains available only while uploading.
- Copy/content: Traditional Chinese passed; one public description and selectable sizes retained. Legacy highlights/specifications/care notes are merged into description before old fields are cleared. Mock inventory and products are labeled as examples.

## Verification and scope

- `npm run check` passed: Traditional Chinese, 59 tests in the current shared workspace, ESLint, TypeScript and 86-page production build.
- Existing design QA history was preserved. Course-page and content-center edits from another task are outside this report.
- Production authentication/storage writes are deliberately not exercised by the local preview.
- No commit, push, or deployment was performed during the local design review.

final result: passed

## Release candidate verification — 2026-09-04

- User approved publishing the selected first design. This release stages only the 13 product-workspace, public-description, test and QA files.
- The local `ProductWorkspacePreview.tsx`, its development page switch, and the user asset folder are excluded from the release.
- The separately authorized course/avatar changes were already committed and pushed as `1ce8233`; the product release is based on that current main revision.
- Exported the staged index to an isolated temporary directory without creating a Git worktree. The exact release candidate passed `npm run check`: Traditional Chinese, 59 tests, ESLint, TypeScript and 85-page production build. No development-only preview route is included.
- Shared crop compatibility is covered by the course release's tests; product release tests cover draft preservation, existing API payloads, sizes, validation, filtering and unsaved-change guards without depending on local fixtures.

## Product workspace scrolling regression — 2026-09-04

- User reported that the media uploads could not be reached in Safari. Reproduced the same failure in an isolated Chromium context at 1363 × 690: the workspace body was 540px high, but its implicit grid row expanded to approximately 944px. The editor scroll region had equal client/scroll height, so the wheel did not move it; the outer workspace clipped the remaining content.
- Fix: bound the desktop grid row with `minmax(0, 1fr)`, allow both grid children and flex scroll areas to shrink, prevent header/toolbars from shrinking, and replace the oversized minimum height. Native scroll chaining is retained for shorter windows. Both scroll regions are keyboard focusable. The selected visual design and product data remain unchanged.
- Browser verification used actual wheel and PageDown input, then hit-tested the main-image upload label and trial-clicked advanced/footer controls. Product-list scrolling and selecting its last item also passed. Viewports: 1363 × 690, 1280 × 600, 1024 × 600, 820 × 700, 390 × 844. No page-level horizontal overflow or runtime errors.
- At the reported desktop size, the corrected editor has 322px client height and 856px content height, and its bottom is within the 690px viewport. The save header stays fixed while the form scrolls.
- Evidence: `/private/tmp/haoyun-product-scroll-before.png`, `/private/tmp/haoyun-product-scroll-after.png`. Local-only fixture preview: `http://localhost:3002/admin`. The original local development server became unresponsive during hot reload, so interaction verification used an isolated temporary copy without changing the production site.
- Traditional Chinese check, 60 tests, ESLint, TypeScript and the isolated 85-page production build passed. Impeccable's detector reported only the pre-existing selected-item border accent, which is intentionally preserved from the approved design.
- Safari automation was unavailable and no WebKit test runtime was installed; native Safari post-release confirmation is still required. No production data was written. This follow-up is local only until publishing is approved.
