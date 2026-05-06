# HWMA（硬體維護）前端操作手冊

> **適用範圍**：本文件依目前程式庫 `src/pages/HardwareMaintenance` 與 `src/router/routes.tsx` 行為整理，供使用者與維運參考。實際 API 欄位與後端規則以環境設定為準。

| 項目 | 說明 |
|------|------|
| 文件位置 | `notes/hwmaguide/HWMA操作手冊.md` |
| **依角色閱讀（User／IT／Vendor）** | [`HWMA操作手冊-依角色.md`](./HWMA操作手冊-依角色.md) |
| 截圖目錄 | `notes/hwmaguide/screenshots/`（見該目錄 `README.md`） |

---

## 目錄

1. [如何進入 HWMA](#1-如何進入-hwma)
2. [路由與網址對照](#2-路由與網址對照)
3. [報修案例列表（HWMA 首頁）](#3-報修案例列表hwma-首頁)
4. [新增報修案例](#4-新增報修案例)
5. [子單管理（依母單）](#5-子單管理依母單)
6. [維修單詳情／子單流程（RepairFlow）](#6-維修單詳情子單流程repairflow)
7. [價格手冊管理](#7-價格手冊管理)
8. [API 與時區提示](#8-api-與時區提示)
9. [截圖補充](#9-截圖補充)
10. [常見問題](#10-常見問題)

---

## 1. 如何進入 HWMA

登入系統後，於左側導覽 **「維修管理」** 區塊：

- **報修單管理**：進入 HWMA 報修案例列表（預設路徑 `/hardware-maintenance`）。
- **價格手冊**：進入可維修品項／合約價維護（路徑 `/hardware-maintenance/pricebook-mgt`）。

![側邊選單示意（請將截圖置於 screenshots）](./screenshots/01-sidebar.png)

---

## 2. 路由與網址對照

| 路徑 | 畫面說明 |
|------|----------|
| `/hardware-maintenance` | 無 query 時：**報修案例列表**（`HWMAHome`）。 |
| `/hardware-maintenance?caseid=<母單編號>` | **子單管理**：以 `caseid` 對應後端 **issued_no**（`HWMAREPAIREDBYCASE`）。 |
| `/hardware-maintenance/<rid>` | **單一維修子單詳情**：`<rid>` 為子單編號 **detail_ticket_no**（`RepairFlow`）。 |
| `/hardware-maintenance/pricebook-mgt` | **價格手冊**（管理員向 API，需後端權限）。 |

程式進入點：`HardwareMaintenanceEntry` 依 query `caseid` 決定顯示列表或子單管理。

---

## 3. 報修案例列表（HWMA 首頁）

路徑：`/hardware-maintenance`（無 `caseid`）。

![報修案例列表示意](./screenshots/02-case-list.png)

### 3.1 KPI 卡片區

頁面上方為 KPI 卡片（維修中案件、設備等待、已完成、平均處理時間等）。目前展示資料以程式預設為主；若需連動後端儀表板，依部署版本為準。

### 3.2 列表載入方式（重要）

- 首次進入時表格會提示：**請設定條件後點擊「搜尋」載入列表**。
- 所有列表請求會帶 **`X-Time-Zone: Asia/Taipei`**（與畫面提示一致）。

### 3.3 API 篩選條件（伺服器端）

| 控制項 | 對應概念 | 說明 |
|--------|----------|------|
| **issued_status** 勾選 | `null` / `Progress` / `Closed` | 可複選；會以逗號串成 API 參數。 |
| **start_date** / **end_date** | 日期（YYYY-MM-DD） | 對應後端區間篩選。 |
| **page_size** | 10 / 20 / 50 | **前端分頁每頁筆數**（非單次 API 筆數上限；列表會分段向後端取回再大列表內分頁）。 |
| **搜尋** 按鈕 | 套用條件並載入 | 會清空「快速搜尋」關鍵字並重設為第 1 頁。 |

### 3.4 快速搜尋（僅前端、僅目前分頁）

- 位置：篩選區下方的 **「快速搜尋（前端 · 僅目前分頁）」**。
- **不會再打 API**，只在**當前頁已載入的列**中：
  - 即時篩選／高亮關鍵字；
  - 將「命中欄位較多」的列排到前面。
- 搜尋範圍涵蓋表格中多個欄位（如 `hrt_id`、`issued_no`、`device_name`、`issue_description` 等）。
- **換頁後**若找不到目標，請確認該頁是否有資料，或改用上方 API 條件縮小範圍後重新搜尋。

### 3.5 表格欄位與操作

表格欄位包含（節錄）：`hrt_id`、`issued_no`、站點與階段、報案者、服務類型、設備與問題描述、母單狀態 `parent_case_status`、`total_sub_tickets`、建立時間、目前角色代碼等。

| 操作 | 行为 |
|------|------|
| **子單管理** | 導向 `/hardware-maintenance?caseid=<該列 issued_no>`，進入該母單下的子單列表。 |

### 3.6 分頁

列表下方為分頁元件；可切換頁碼瀏覽已載入之全部案例之前端分頁結果。

---

## 4. 新增報修案例

在報修案例列表頁點 **「新增報修」** 開啟 Modal。

![新增報修 Modal](./screenshots/03-create-case-modal.png)

### 4.1 必填與後端產生欄位

- **必填**：**service_type**，須選 **PC**、**Parts** 或 **Monitor** 之一。
- **勿自行填寫**：`hrt_id`、案例建立時間等由後端產生；表單設計上亦不送出這類欄位。

### 4.2 選填欄位與預填功能

- **issued_no（case id）**  
  - 可手動輸入母單編號。  
  - **「get case center data」**：呼叫 Case Center 預填（GET 對應 **case-center_data** 類 API），帶入報案者、站點、設備資訊、問題描述等。若無資料可能顯示「查無資料」。

- **device_name**  
  - **「get ITCMS device-info」**：依設備名稱向 ITCMS 取設備規格與保固日等；成功時可帶入品牌、型號、序號、保固日期（YYYY-MM-DD）等。

- **issued_site**  
  - 選項來自 **GET /cases/service/site**；選單顯示值可能含字面 **`"null"`** 表示「不限」類意義（與後端約定一致）。

- **device_brand / device_model**  
  - 依 **service_type** 連動 **GET /cases/service/type** 回傳之 pc / monitor / parts 清單；先選品牌再選型號。

- **warranty_date**  
  - 保固／到期等日期，建議格式 **YYYY-MM-DD**。

其餘文字欄位若留空，送出時通常不帶該欄位（由 `buildHwmCreateBody` 處理）。

### 4.3 送出結果

- 成功：顯示成功訊息（含 `issued_no`、`hrt_id`），並關閉視窗。  
- 若目前列表已載入，可能將新案例插入列表開頭（依程式邏輯）。

---

## 5. 子單管理（依母單）

路徑：`/hardware-maintenance?caseid=<母單編號>`  
（由列表點 **「子單管理」** 或自行在網址加上 query。）

![子單管理頁](./screenshots/04-subticket-by-case.png)

### 5.1 若未帶 caseid

畫面會提示需在網址加上 **`?caseid=母單編號`**。

### 5.2 頁面內容

- **返回報修列表**：回到 `/hardware-maintenance`。  
- **母單摘要**：報案者、員工工號、地點、設備、借用設備、問題描述等（來自母單快照）。  
- **子單總數**與 **「新建子單」**：建立新維修子單後會重新載入列表。  
- **維修子單列表**（每張卡片）：
  - **子單編號** `detail_ticket_no`、`current_status`
  - **開始時間**、**維修時長**（歷程秒數加總換算）、**目前處理者**、**完成度**（依流程節點估算之百分比與進度條）
  - **查看詳情**：進入 **`/hardware-maintenance/<RID>`**（RID 即該子單之 `detail_ticket_no`）

---

## 6. 維修單詳情／子單流程（RepairFlow）

路徑：`/hardware-maintenance/<rid>`  
`<rid>` = 該子單的 **detail_ticket_no**（畫面右上角 **RID** 同此值）。

![維修單頁首與母單資訊](./screenshots/05-repair-flow-header.png)

### 6.1 頁首與返回

- **← 返回**：若有母單 `issued_no`，會回到 **`/hardware-maintenance?caseid=...`**；否則回到列表。
- **新增子單備註**：開啟備註輸入（POST **/cases/repairs/:RID/comment**）。送出成功後會顯示時間戳提示（歷程是否可查依後端設計）。
- **設定代領人**：設定設備代領人（POST **/cases/reqpir/:RID/proxy**）。同一子單再次送出會**覆寫**代領人與時間（與畫面說明一致）。
- **其他特殊動作**：若後端傳回 `is_special` 之動作，會以額外按鈕顯示。

### 6.2 母單與子單資訊卡

- 顯示母單單號、**目前節點狀態** `current_status`、報案者、地點、設備、問題描述、目前處理者、聯絡電話等。
- 若有 **子單備註**、**子單內文**（`detail_issued_context`）：
  - 可能包含 **repaired_issued_msg**（廠商判斷說明）與 **repair_items** 表格（類別、品名、規格、機型、數量、保固判定、備註）。

### 6.3 流程操作按鈕（一般動作）

`flow_status.available_actions` 中 **非 special** 且非「廠商 SUBMIT／到料日期」專屬者，顯示為主操作區按鈕。點擊會呼叫 **PATCH transition**（**PATCH …/transition/:repairId**），帶 `action_code` 與需要的 `context`。

預設動作可能顯示為 **primary** 樣式（`is_default`）。

### 6.4 維修流程進度（StepFlow）

![StepFlow 區塊](./screenshots/06-stepflow.png)

- **已完成**：歷程節點（history），可顯示耗時、時間、責任人員等。
- **進行中**：目前狀態節點；若目前為「廠商判定」或「選擇到料日期」等，節點上會出現對應操作（如 **建立維修項目**、**選擇到料日期**）。
- **待處理**：後續預設路徑節點（含 SLA 提示等）。

### 6.5 廠商判定維修項目（SUBMIT）

當節點需要廠商送出報價與料件時，點 **建立維修項目**（或同等入口）會開啟 **「廠商判定維修項目（SUBMIT）」** 視窗：

![廠商判定 Modal](./screenshots/07-vendor-submit-modal.png)

1. **適用機型**：顯示目前料件 bundle 之機型或母單機型。  
2. **搜尋品項**：在品項卡片上方可輸入關鍵字，依 **類別、品名、規格、機型** 篩選（不分大小寫；多個關鍵字以空白分隔須全部命中）。  
3. **可維修品項**：資料來自 **GET /cases/:case_id/reqpir-items**（`case_id` 通常為母單 `issued_no` 或 `hrt_id`，依 API 實作）。每張卡片顯示 **類別**、品名、規格、單價或「時價」；點卡片 **「+」** 加入 **本次報價項目**。  
4. **本次報價項目**：至少一筆。每列可調整 **保固判定**、數量、備註等。  
5. **廠商判斷項目（repaired_issued_msg）**：文字說明。  
6. **送出**：以 **action_code `SUBMIT`** 呼叫 transition，`context` 內含 **repqir_items**（注意與專案 API 拼字）與 **repaired_issued_msg**。

> 專案中 API 路徑與欄位名稱可能保留 **reqpir / repqir** 等歷史拼字，與後端契約需一致。

### 6.6 選擇到料日期

若目前節點為「確認到料日」類狀態，主畫面會提供 **選擇到料日期**：選日期後送出，會以 transition 帶 **`repqir_date`**（或後端約定欄位）與對應 **action_code**。

### 6.7 錯誤與鎖定

- 進行 transition 時按鈕可能顯示「處理中…」，並避免重複送出（前端鎖）。  
- 錯誤訊息顯示於頁面上方橫幅，可手動關閉。

---

## 7. 價格手冊管理

路徑：`/hardware-maintenance/pricebook-mgt`  
（左側 **價格手冊**。）

![價格手冊](./screenshots/08-pricebook-mgt.png)

此頁使用 **reqpirAdminAPI**，對應後台維護用 REST（如 **GET/POST/PATCH/DELETE /reqpir/items** 與 **/reqpir/contracts**）。需後端授權與正確 Header。

### 7.1 分頁籤

- **品項**：可維修品目錄（類別、品名、類型、適用機型、是否啟用等）。  
- **合約價**：合約價設定；可依 **hri_id** / **hrr_id** 篩選列表。

### 7.2 操作型態

- 新增／編輯品項與合約（Modal 表單）。  
- 實際必填欄位與驗證以畫面提示與 API 回應為準。

---

## 8. API 與時區提示

- 案例列表等請求使用 **`X-Time-Zone: Asia/Taipei`**（見 `hwma.ts` 常數 **HWMA_X_TIME_ZONE**）。  
- 各功能實際 HTTP 路徑、方法與 body 以 **`src/api/hwma.ts`** 之 **hardwareMaintenanceAPI**、**reqpirAdminAPI** 為準。

---

## 9. 截圖補充

本手冊已預留 Markdown 圖片語法，例如：

```markdown
![說明](./screenshots/02-case-list.png)
```

請在本機啟動前端（如 `npm run dev`），於瀏覽器操作各畫面後擷圖，存入 **`notes/hwmaguide/screenshots/`**，檔名請對照 **`screenshots/README.md`** 之建議清單。  
若檔案尚未放置，部分閱讀器會顯示破圖，屬正常現象。

**注意**：目前無法由文件自動產生真實畫面截圖，需人工補上。

---

## 10. 常見問題

**Q：為什麼列表一進來是空的？**  
A：必須先設定 **issued_status／日期** 等條件後按 **「搜尋」**，才會向伺服器載入資料。

**Q：快速搜尋為什麼換頁就找不到？**  
A：快速搜尋只篩選 **目前這一頁** 的列；請換頁後再搜，或先用 API 條件縮小列表範圍。

**Q：子單詳情的網址要用什麼？**  
A：使用子單編號 **detail_ticket_no** 作為路徑 **`/hardware-maintenance/<RID>`**，與畫面 **RID** 相同。

**Q：廠商送出時 context 欄位名稱是？**  
A：程式使用 **repqir_items** 與 **repaired_issued_msg** 傳入 SUBMIT；若後端改名需同步修改前端。

**Q：價格手冊打不開或 403？**  
A：管理 API 可能需額外權限或 Header，請洽後端／管理員。

---

## 修訂紀錄

| 日期 | 說明 |
|------|------|
| 2026-04-30 | 初版：依 `HardwareMaintenance` 模組與路由撰寫 |

---

*若程式更新導致與本手冊不符，請以原始碼與後端 API 文件為準，並于此處更新修訂紀錄。*
