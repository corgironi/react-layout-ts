# Router 重構計畫 — 動態權限路由與 Sidebar

> 日期：2026-05-14
> 目的：討論用；尚未修改任何程式碼

---

## 一、目前現況分析

### 1.1 涉及檔案

| 檔案 | 職責 | 問題 |
|------|------|------|
| `src/router/routes.tsx` | 用 `createBrowserRouter` **寫死**全部路由 | 無法依角色動態增減路由；新增系統必須改此檔 |
| `src/router/PrivateRoute.tsx` | 檢查「有沒有登入」→ 沒有就導 `/login` | 只管認證（Authentication），不管授權（Authorization） |
| `src/router/AppRouter.tsx` | `<RouterProvider router={router} />`，3 行 | 無問題 |
| `src/components/Sidebar.tsx` | **寫死**所有選單項目與 path | 無法依權限動態顯示/隱藏/灰化 |
| `src/store/useAuthStore.ts` | Zustand store，存 `user.systems: SystemRole[]` | 已有 `systemName + roles`，可直接利用 |
| `src/components/Sidebar.module.css` | Sidebar 樣式 | 缺少 `disabled` 狀態樣式 |

### 1.2 現有 Store 的 User 結構

```typescript
// src/store/useAuthStore.ts
interface SystemRole {
  systemName: string;   // 例："attendance"、"hardware-maintenance"
  roles: string[];      // 例：["admin", "onsite IT"]
}

interface User {
  useraccount: string;
  username: string;
  systems: SystemRole[];
  // ... 其他欄位
}
```

- `user.systems` 已經是 **per-system 的 role 陣列**，足夠做權限判斷
- 不需要改 store 結構（或只需小幅擴充）

### 1.3 後端預計回傳的權限格式

```jsonc
// 登入成功 / getUserProfile 時回傳
{
  "systems": [
    {
      "systemName": "attendance",
      "roles": ["admin", "onsite IT"],
      "routes": [
        { "system_sub_path": ["daily"],   "visible": "Y", "needVerify": "N" },
        { "system_sub_path": ["leave"],   "visible": "Y", "needVerify": "Y" },
        { "system_sub_path": ["summary"], "visible": "N", "needVerify": "N" }
      ]
    },
    {
      "systemName": "hardware-maintenance",
      "roles": ["vendor"],
      "routes": [
        { "system_sub_path": [""],              "visible": "Y", "needVerify": "N" },
        { "system_sub_path": ["pricebook-mgt"], "visible": "Y", "needVerify": "Y", "role": ["admin"] }
      ]
    }
  ]
}
```

**重點**：`visible` / `needVerify` 後端已依角色算好；`role` 欄位可選，有帶才比。

---

## 二、需求整理

### 2.1 兩層樹狀路由

```
第一層（系統）        第二層（子路由）
─────────────        ──────────────
attendance      ──→  daily, leave, overtime, summary
hardware-maint  ──→  (根), pricebook-mgt, :rid
system          ──→  createuser, usermaintenance
```

- 每一層都要能獨立控制 **可見性** 和 **進入權限**

### 2.2 Sidebar 三種狀態

| visible | needVerify | 使用者有 role | Sidebar 效果 |
|:-------:|:----------:|:------------:|-------------|
| N | — | — | **不顯示** |
| Y | N | — | 顯示、可點、可進 |
| Y | Y | 有 | 顯示、可點、可進 |
| Y | Y | 沒有 | 顯示、**灰色不可點** |

### 2.3 設計原則

1. **PrivateRoute 不動** — 繼續只管「有沒有登入」
2. **新增 RoleGuard** — 獨立元件，只管「角色對不對」
3. **單一資料源** — Sidebar 和 Route 共用同一份設定表
4. **後端做主判斷** — 前端只是「執行者」，讀 visible / needVerify 來決定渲染

---

## 三、方案比較

### 方案 A：最小改動（推薦先做）

新增 2 個檔案，改 2 個現有檔案。

```
src/router/
├── PrivateRoute.tsx       ← 不動
├── RoleGuard.tsx           ← 新增
├── routeConfig.ts          ← 新增（型別 + 靜態路由對照表）
├── routes.tsx              ← 改：引用 routeConfig 產生路由
└── AppRouter.tsx           ← 不動

src/components/
├── Sidebar.tsx             ← 改：引用 routeConfig + store 動態渲染
└── Sidebar.module.css      ← 加 .disabled 樣式
```

#### 新增：`routeConfig.ts`

定義前端路由註冊表，把 **「哪個 path 對應哪個 element」** 和 **「預設權限」** 寫在一起：

```typescript
export interface SubRouteEntry {
  subPath: string;
  label: string;
  icon?: string;
  defaultVisible: boolean;
  defaultNeedVerify: boolean;
  defaultAllowedRoles: string[];
  element: React.ComponentType;
}

export interface SystemRouteEntry {
  systemName: string;
  basePath: string;
  label: string;
  icon: string;
  defaultVisible: boolean;
  defaultNeedVerify: boolean;
  defaultAllowedRoles: string[];
  subRoutes: SubRouteEntry[];
}

export const SYSTEM_ROUTES: SystemRouteEntry[] = [
  {
    systemName: 'attendance',
    basePath: '/attendance',
    label: '出勤系統',
    icon: 'fas fa-clock',
    defaultVisible: true,
    defaultNeedVerify: false,
    defaultAllowedRoles: [],
    subRoutes: [
      { subPath: 'daily',    label: '每日出勤', element: Daily, ... },
      { subPath: 'leave',    label: '請假管理', element: Leave, ... },
      { subPath: 'overtime', label: '加班管理', element: Overtime, ... },
      { subPath: 'summary',  label: '出勤彙總', element: Summary, ... },
    ],
  },
  {
    systemName: 'hardware-maintenance',
    basePath: '/hardware-maintenance',
    label: '維修管理',
    icon: 'fas fa-wrench',
    defaultVisible: true,
    defaultNeedVerify: false,
    defaultAllowedRoles: [],
    subRoutes: [
      { subPath: '',              label: '報修單管理', element: HWMAEntry, ... },
      { subPath: 'pricebook-mgt', label: '價格手冊',   element: PricebookMGT, ... },
    ],
  },
  // ... system 等
];
```

**優點**：
- 新增系統只要在這一份檔案加一筆
- Sidebar 和 routes.tsx 都讀這份資料，不用兩邊改

**`routes.tsx` 的改法**：遍歷 `SYSTEM_ROUTES`，對 `needVerify` 的路由包 `<RoleGuard>`

```
原本                                   改後
────                                   ────
{ path: 'leave', element: <Leave/> }   { path: 'leave', element: <RoleGuard ...><Leave/></RoleGuard> }
```

#### 新增：`RoleGuard.tsx`

```typescript
interface RoleGuardProps {
  systemName: string;
  allowedRoles?: string[];
  children: React.ReactElement;
}
```

邏輯：
1. 從 `useAuthStore` 拿 `user.systems`
2. 找 `systemName` 對應的 `roles`
3. 有 `allowedRoles` → 交叉比對 → 沒有匹配就 `<Navigate to="/" />`
4. 沒 `allowedRoles` 或空陣列 → 直接放行

#### 改 `Sidebar.tsx`

從 `SYSTEM_ROUTES` + `useAuthStore` 產生選單，不再硬編碼。

判斷函數：

```typescript
type AccessLevel = 'full' | 'viewOnly' | 'hidden';

function getAccessLevel(
  backendRoute: BackendRouteEntry | undefined,
  fallback: { visible: boolean; needVerify: boolean; allowedRoles: string[] },
  userRoles: string[],
): AccessLevel {
  const visible = backendRoute ? backendRoute.visible === 'Y' : fallback.visible;
  if (!visible) return 'hidden';

  const needVerify = backendRoute ? backendRoute.needVerify === 'Y' : fallback.needVerify;
  if (!needVerify) return 'full';

  const roles = backendRoute?.role ?? fallback.allowedRoles;
  if (!roles.length) return 'full';

  return roles.some((r) => userRoles.includes(r)) ? 'full' : 'viewOnly';
}
```

- `hidden` → 不渲染
- `viewOnly` → 渲染但加 `.disabled` class
- `full` → 正常可點

#### 改動範圍總結

| 項目 | 類型 | 改動量 |
|------|------|--------|
| `routeConfig.ts` | 新增 | ~80 行（型別 + 資料） |
| `RoleGuard.tsx` | 新增 | ~25 行 |
| `routes.tsx` | 修改 | 中等（改用 map 產生 children） |
| `Sidebar.tsx` | 修改 | 大（原本硬編碼全部改動態） |
| `Sidebar.module.css` | 修改 | 小（加 `.disabled` 樣式） |
| `PrivateRoute.tsx` | **不動** | 0 |
| `AppRouter.tsx` | **不動** | 0 |
| `useAuthStore.ts` | **不動或小改** | 0 或加 routes 欄位 |

---

### 方案 B：完全動態（進階版）

在方案 A 的基礎上，加一個 `buildRoutes.tsx`：

```
src/router/
├── PrivateRoute.tsx       ← 不動
├── RoleGuard.tsx           ← 新增
├── routeConfig.ts          ← 新增
├── buildRoutes.tsx         ← 新增（動態產生 RouteObject[]）
├── routes.tsx              ← 改：呼叫 buildRoutes()
└── AppRouter.tsx           ← 不動
```

`buildRoutes.tsx` 負責：
1. 讀 `SYSTEM_ROUTES`
2. 讀 store 的 `user.systems`（含後端 routes 權限）
3. 只對 **visible** 的路由產生 `RouteObject`
4. 對 **needVerify** 的路由包 `<RoleGuard>`

**額外優點**：
- `routes.tsx` 幾乎不用手動維護
- 後端沒給的路由 → 前端也不會產生 → 安全性更高
- 未來加 lazy loading（`React.lazy`）更方便

**缺點**：
- `createBrowserRouter` 是在 module scope 執行的，如果要動態化需要改成 function call
- `AppRouter.tsx` 要配合改（用 `createBrowserRouter` 在 component 內或用 `createRoutesFromElements`）
- 如果後端回傳延遲，會有短暫空白或 loading 狀態

---

### 方案 C：Sidebar 先改、路由慢慢來

如果想要分階段上線：

**Phase 1（最小改動）**：
- 只新增 `routeConfig.ts` + 改 `Sidebar.tsx` → 讓 Sidebar 動態化
- `routes.tsx` 暫時不改，所有路由還是寫死
- 只差 Sidebar 看不看得到，但手打 URL 還是進得去

**Phase 2**：
- 新增 `RoleGuard.tsx`，在 `routes.tsx` 裡對需要的路由包上去
- 手打 URL 也會被擋

**Phase 3**：
- 用 `buildRoutes.tsx` 完全動態化

---

## 四、Store 需不需要改？

### 情況一：後端 routes 權限跟著 getUserProfile 一起回來

把 `SystemRole` 擴充：

```typescript
// 方案：擴充現有 interface
interface BackendRoutePermission {
  system_sub_path: string[];
  visible: 'Y' | 'N';
  needVerify: 'Y' | 'N';
  role?: string[];
}

interface SystemRole {
  systemName: string;
  roles: string[];
  routes?: BackendRoutePermission[];  // ← 新增，可選
}
```

**改動**：只多一個可選欄位，完全向後相容。

### 情況二：後端另外一支 API 回傳權限

在 store 加一個獨立欄位：

```typescript
interface AuthState {
  // ... 現有 ...
  routePermissions: BackendSystemEntry[] | null;
  setRoutePermissions: (perms: BackendSystemEntry[]) => void;
}
```

登入後呼叫 API 拿權限、存進去。

### 建議

如果後端能把 routes 跟 profile 一起帶回來 → **情況一**最省事。

---

## 五、流程圖

```
使用者登入
  │
  ├─ POST /auth/login → 拿 token
  │
  ├─ GET /auth/profile → 拿 user（含 systems + routes 權限）
  │
  ├─ 存進 useAuthStore
  │
  ├─ Sidebar 讀 store
  │    ├─ SYSTEM_ROUTES.map((sys) => {
  │    │     後端有這個 system? → 繼續
  │    │     sub.visible === 'N'  → 不渲染
  │    │     sub.needVerify + 沒 role → 灰色
  │    │     sub.needVerify + 有 role → 正常
  │    │     sub.needVerify === 'N' → 正常
  │    └─ })
  │
  └─ 使用者點路由
       │
       ├─ 第一層守衛：PrivateRoute（不動）
       │    └─ 沒登入 → /login
       │
       └─ 第二層守衛：RoleGuard（新增）
            ├─ needVerify === 'N' → 放行
            ├─ 有 role 且匹配 → 放行
            ├─ 有 role 但不匹配 → 導回首頁或 403
            └─ 沒帶 role → 放行（後端已判定 visible）
```

---

## 六、需要跟後端確認的事項

| # | 問題 | 影響 |
|---|------|------|
| 1 | routes 權限是跟 getUserProfile 一起回來，還是要另外打一支 API？ | 決定 store 怎麼存 |
| 2 | `visible` / `needVerify` 的值是 `"Y"/"N"` 還是 `true/false`？ | 型別定義 |
| 3 | `role` 欄位什麼時候才會帶？是只有 `needVerify: "Y"` 時才有嗎？ | 前端 fallback 邏輯 |
| 4 | 如果後端沒給某個 system 的 routes，是代表「全部隱藏」還是「全部開放」？ | 預設行為設計 |
| 5 | `:rid` 這種動態路由的權限怎麼判定？（靠 system 層級就好？） | RoleGuard 設計 |
| 6 | 未來會不會有「第三層」子路由？ | 是否需要遞迴結構 |

---

## 七、推薦路線

> **方案 A**（最小改動），搭配 **Phase 分段上線**

理由：
1. `PrivateRoute` 不動 → 不影響現有登入流程
2. 只新增 2 個檔案 → 風險低
3. Sidebar 可以先改（Phase 1），路由守衛後補（Phase 2）
4. 跟現在的專案拆法一致（像 `api.ts` 拆成 `hwma.ts` 一樣，各管各的）

如果未來系統變多、權限變複雜，再升級成方案 B 也很順，因為方案 A 的 `routeConfig.ts` 可以直接被 `buildRoutes.tsx` 吃。

---

## 八、附錄：CSS 補充

`Sidebar.module.css` 需要新增 disabled 樣式：

```css
/* 有權限看但沒權限進的路由項目 */
.navItem.disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

/* 子路由縮排（如果要展開式 Sidebar） */
.navSubItem {
  padding-left: 3rem;
  font-size: 0.875rem;
}
```
