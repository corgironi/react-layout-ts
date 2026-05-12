# HWMA 母單／子單與留言（Comment）串接說明

> 以下為後端契約摘要；**前端實作對照**見本文件末節。

## 原則

- 留言只存在後端 `reqpircomment.json`，依 **detail_ticket_no**（子單 repairId）綁定。
- **一般畫面不要另外打 comment 專用 API**：取單一母單或子單列表／明細時，後端已把留言依時間掛進 `flow_status` 的 **history**、**current_state**、以及 **default_future_paths** 的目前節點。
- 若仍需要「純留言陣列」（除錯、匯出），才用 `GET /cases/repairs/:detail_ticket_no/comment`。

## 1. 取單一母單＋全部子單（推薦：一鍵含留言）

| 項目 | 內容 |
|------|------|
| Method | GET |
| Path | `/HWMA/case/:issued_no` |
| Header | `X-Time-Zone: Asia/Taipei`（必填） |
| Path 參數 | `:issued_no`＝母單 issued_no（必要時 URL 編碼） |

**回傳形狀（重點）**

- 最外層：母單欄位（`hrt_id`、`issued_no`、`service_type`…）＋ **`repairs`** 陣列。
- `repairs`：每一筆是一張子單，結構與 `GET /HWMA/repaired` 的單筆相同。

**前端**：`hardwareMaintenanceAPI.getCaseWithRepairsByIssuedNo(issued_no)`（`src/api/hwma.ts`）。

## 2. Comment 要從哪裡「讀」到畫面上

對 `repairs` 陣列裡的每一筆 `repair`，只看 **`repair.flow_status`**：

### A. 已發生流程（過去節點）— history

- **路徑**：`repair.flow_status.history`
- **留言位置**：`history[i].comments`（陣列，可能為 `[]`）。
- **元素形狀**：`{ "comment": "字串", "created_at": "ISO 時間" }`。
- **語意**：`created_at` 落在該段的 `entered_at`～`left_at`（含邊界）的留言，後端會掛在這一段。

### B. 目前進行中（現在節點）— current_state

- **路徑**：`repair.flow_status.current_state`
- **留言位置**：`repair.flow_status.current_state.comments`（陣列）。
- **語意**：晚於 history 最後一段的 `left_at` 的留言，或尚無 history 時的留言，會出現在這裡。

### C. 流程圖／路徑圖 — default_future_paths

- **路徑**：`repair.flow_status.default_future_paths`
- **留言位置**：`default_future_paths[j].comments`，其中 **`is_current === true`** 的那一筆與 `current_state.comments` 一致。
- **本專案 UI**：StepFlow 以 **current_state** 顯示「目前節點」留言；**future 路徑上 `is_current` 的 comments 不重複顯示**（避免與 current_state 重複）。

## 3. 其他仍會帶留言的 API

| API | Comment 讀取位置 |
|-----|------------------|
| `GET /HWMA/repaired?issued_no=...` | `items[i].flow_status.history` / `current_state` / `default_future_paths` |
| `GET /HWMA/repaired/:rid` | 同上，單筆子單的 `flow_status` |
| `PATCH /HWMA/transition/:repairId` 回應 | 同上 |

## 4. 新增留言

| 項目 | 內容 |
|------|------|
| Method | POST |
| Path | `/cases/repairs/:detail_ticket_no/comment` |
| Body | `{ "comment": "..." }` 或 `{ "text": "..." }` |

寫入後，下次 GET 母單或子單，後端會依 `created_at` 再分到某段 `history[].comments` 或 `current_state.comments`。

**前端**：`hardwareMaintenanceAPI.postRepairComment`；除錯陣列：`getRepairComments(detail_ticket_no)`。

---

## 實作對照（本 repo）

| 說明 | 位置 |
|------|------|
| 型別 `HWMAFlowCommentEntry`、`history/current_state/default_future_paths.comments` | `src/api/hwma.ts` |
| `GET /HWMA/case/:issued_no` | `hardwareMaintenanceAPI.getCaseWithRepairsByIssuedNo`（`hwma.ts`） |
| `GET .../comment`（除錯／匯出） | `hardwareMaintenanceAPI.getRepairComments`（`hwma.ts`） |
| **Comment 從哪裡讀到畫面**（模組頂部註解 + 組裝邏輯） | `src/pages/HardwareMaintenance/RepairFlow.tsx` 檔首、`buildStepsFromRepairItem`、`formatFlowStatusComments` |
| POST 備註成功後 **自動 refetch** 子單 | `RepairFlow.tsx` → `submitRepairComment` |
| 多行留言顯示 | `StepFlow.module.css` → `.stepComment` 使用 `white-space: pre-line` |

母單列表頁若只需母單、不含子單與 comment：請用既有 **GET /HWMA/case**（分頁）；進詳情再打 **`GET /HWMA/case/:issued_no`** 或子單 **`GET /HWMA/repaired/:rid`**。
