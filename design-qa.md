# Design QA

## Source visual truth

- 教練原始照片：`/Users/yangyichen/Downloads/Gmail`
- 榮耀徽章原始照片：`/Users/yangyichen/Downloads/徽章形象照_拉拉`
- 使用者提供的課程表、課程詳情與手機排版截圖，以及本輪明確的內容與互動規則

## Implementation evidence

- 桌面課程表：`/private/tmp/haoyun-courses-desktop.png`
- 手機課程色塊：`/private/tmp/haoyun-courses-mobile-schedule3.png`
- 桌面課程教練區：`/private/tmp/haoyun-course-coaches-desktop2.png`
- 桌面團隊頁：`/private/tmp/haoyun-team-desktop.png`
- 手機團隊名片：`/private/tmp/haoyun-team-mobile-card.png`
- 桌面榮耀徽章頁：`/private/tmp/haoyun-achievements-desktop.png`
- 手機榮耀徽章首屏：`/private/tmp/haoyun-achievements-mobile.png`
- 教練來源／實作合併比較：`/private/tmp/qa-team-comparison.jpg`
- 徽章來源／實作合併比較：`/private/tmp/qa-badges-comparison.jpg`

## Viewports and states

- 桌面：1440 × 1000
- 手機：390 × 844
- 課程表：全部課程、新手篩選、桌面七欄、手機分日卡片
- 課程詳情：頁首、教練名片、適合對象與底部報名面板
- 團隊頁：完整三欄名單、手機單欄名片、指定教練錨點
- 榮耀徽章：系列首屏、實體照片、五款介紹與申請規則
- 學員見證：未設定影片時的自動收合狀態

## Full-view comparison evidence

- 教練照片以原始 Gmail 素材為唯一來源；合併比較確認服裝、人物與臉部均與來源一致。圓形頭像使用獨立 640 × 640 臉部裁切，沒有拉伸、代用圖或失焦。
- 榮耀徽章頁直接使用來源資料夾中的系列照、單款照、BQ Pride 與達標紀念卡；黑金視覺、材質與徽章細節均保持來源照片品質。
- 課程表桌面七欄中的課程卡片均自星期表頭下方開始向上堆疊，沒有保留空白時間列；所有課程色塊統一為灰色，星期表頭維持黑色。
- 課程詳情移除費用說明，教練資料收斂為姓名、負責班級與團隊頁跳轉，黑色報名面板位於內容最下方。

## Focused region comparison evidence

- 教練頭像：來源人物與手機名片並排檢查，臉部完整落在圓框內，頭頂與下巴保留合理空間。
- 徽章首屏：來源全系列照片與 390 × 844 實作並排檢查，圖像比例、黑金配色與文字層級一致，沒有壓縮或裁掉主要徽章。
- 課程教練名片：1440 × 1000 定位檢查確認三張卡片等寬、班級名稱已精簡，跳轉提示清楚。

## Findings

- 沒有剩餘 P0、P1 或 P2 問題。
- P3：學員見證目前尚未由管理員填入正式 YouTube 網址，因此本輪只能驗證空狀態自動收合、網址解析邏輯與完整編譯；正式影片上線後可再做一次播放器內容檢查。

## Interaction and accessibility checks

- 課程「新手」篩選可將桌面課表收斂為初心／初階班，切回「全部」可恢復完整名單。
- 課程卡片可進入對應詳情頁。
- 課程詳情的教練名片可進入 `/team#coach-...`，指定教練落在導覽列下方的可見位置。
- 桌面與手機頁面 `scrollWidth` 均等於 viewport width，沒有水平溢出。
- 主要圖片均有描述性替代文字；互動使用語意化連結與按鈕。
- 檢查頁面沒有瀏覽器 console error。
- 可見文案未偵測到簡體中文；另有建置前掃描與執行期繁體轉換作為防護。

## Comparison history

- Pass 1：發現課程教練名片重複顯示完整年度課程名稱，資訊密度偏高。
- Fix：將名片內的負責班級縮短為「週一竹北夜跑班」等班級名稱。
- Post-fix evidence：`/private/tmp/haoyun-course-coaches-desktop2.png`，三張名片均已縮短且沒有換行擁擠。

## Final result

final result: passed
