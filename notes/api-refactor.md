# API 模組拆分（2026）

## 目的

- 將原本單一巨型 `api.ts` 依業務拆檔，降低多人協作時的 Git 衝突與 review 負擔。
- **呼叫端維持原 import**：仍可使用 `import { hardwareMaintenanceAPI } from '../api/api'` 或 `import api from '../api/api'`，無須全面改路徑。

## 新檔案結構（`src/api/`）

| 檔案 | 職責 |
|------|------|
| **`client.ts`** | `axios` 主實例 `api`、refresh 用 `refreshApi`、`setTokens` / `clearTokens`、`getAccessToken` / `getRefreshToken`；**僅註冊 request 攔截器**（附帶 Bearer）。 |
| **`auth.ts`** | `authAPI`（登入、refresh、SSO、logout、profile 等）；**註冊 401 response 攔截器**（依賴已建立的 `authAPI`，避免與 `client` 循環依賴）。 |
| **`attendance.ts`** | `attendanceAPI`、`overtimeAPI`、`getSameEmployers`、`getUserGroup`。 |
| **`user.ts`** | `userAPI`。 |
| **`hwma.ts`** | HWMA／Cases／ReqPir 後台相關型別、`HWMA_X_TIME_ZONE`、`hardwareMaintenanceAPI`、`reqpirAdminAPI` 與內部 `normalizeReqPirList`。 |
| **`api.ts`** | **僅 re-export**：等同公開 API  surface，與重構前對呼叫端一致。 |

### Side-effect import

`attendance.ts`、`user.ts`、`hwma.ts` 開頭均有 `import './auth'`，確保僅直接載入子模組時也會完成 **401 攔截器註冊**（若只 `import { api } from './client'` 而不經過 `auth`，將無法自動 refresh）。

經由 **`api.ts` 匯入** 時，`auth` 會隨 `authAPI` 的匯出鏈被載入。

## 未動到的部分

- 未在此 repo 的 **SOP API** 等維持各自維護；以下為未來若要對齊時的建議步驟。

## 未來新增獨立業務 API（例如 `sopApi`）

1. 新增 `src/api/sop.ts`（或 `sop/sopApi.ts`），第一行：`import './auth';`，其餘使用 **`import { api } from './client'`** 發請求。
2. 在 **`api.ts`** 增加：`export * from './sop'` 或 `export { sopAPI } from './sop'`。
3. 型別可放在同檔或 `sop/types.ts`。
4. 勿新建第二組 axios 實例（除非另有 baseURL／認證策略）；token、401、c learTokens 仍由 **client + auth** 統一處理。

## 驗證

- `npm run build`：通過。
- `npm run test:run`：通過（含 `HWMAHome.test.tsx` mock `'../../api/api'`）。

## 向後相容匯出一覽（仍由 `api.ts` 提供）

- `default`、`api`、`refreshApi`、`setTokens`、`clearTokens`、`getAccessToken`、`getRefreshToken`
- `authAPI`
- `attendanceAPI`、`overtimeAPI`、`getSameEmployers`、`getUserGroup`
- `userAPI`
- `hwma.ts` 之 **`export *`**（含所有 HWMA／ReqPir 型別、`hardwareMaintenanceAPI`、`reqpirAdminAPI` 等）
