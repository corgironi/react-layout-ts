# Card 與 WarningBanner Component 功能對比分析

## Card Component 功能清單

### 基本功能
1. **內容容器** - `children` (React.ReactNode) - 可容納任意 React 內容
2. **自定義樣式** - `className` (string) - 允許外部自定義樣式
3. **點擊事件** - `onClick` (function), `isClickable` (boolean) - 支援點擊互動
4. **連結功能** - `href` (string) - 可渲染為 `<a>` 標籤，支援連結導航

### 樣式變體
5. **卡片變體** - `variant`: 'default' | 'elevated' | 'outlined' - 三種視覺風格
6. **尺寸控制** - `size`: 'small' | 'medium' | 'large' - 控制卡片大小
7. **邊框顏色** - `borderColor`: 'blue' | 'yellow' | 'green' | 'purple' | 'red' | 'orange' | 'primary' | 'none' - 左側邊框顏色
8. **內邊距控制** - `padding`: 'none' | 'small' | 'medium' | 'large' - 自定義內邊距
9. **陰影控制** - `shadow`: 'none' | 'small' | 'medium' | 'large' - 自定義陰影強度
10. **背景漸變** - `gradient` (boolean) - 啟用背景漸變效果

### 圖標功能
11. **圖標顯示** - `icon` (string | React.ReactNode) - 支援 emoji 或 React 組件
12. **圖標位置** - `iconPosition`: 'left' | 'top' | 'right' - 控制圖標位置
13. **圖標大小** - `iconSize`: 'small' | 'medium' | 'large' - 控制圖標尺寸

### 內容結構
14. **標題** - `title` (string) - 卡片標題
15. **副標題** - `subtitle` (string) - 卡片副標題
16. **角標** - `badge` (React.ReactNode) - 右上角角標顯示
17. **操作按鈕** - `actions` (React.ReactNode) - 底部操作按鈕區域

### 狀態控制
18. **載入狀態** - `loading` (boolean) - 顯示 spinner 動畫，禁用互動
19. **禁用狀態** - `disabled` (boolean) - 禁用卡片互動功能

---

## WarningBanner Component 功能清單

### 基本功能
1. **多項目顯示** - `items` (WarningBannerItem[]) - 以陣列形式接收多個警告項目
2. **點擊事件** - `onItemClick` (function) - 點擊單個警告項目時觸發，會傳遞警告項目資料
3. **關閉功能** - `onDismiss` (function) - 關閉單個警告項目
4. **尺寸控制** - `size`: 'large' | 'medium' | 'small' - 控制整體尺寸

### 警告級別系統
5. **警告級別** - `warningLevel`: 'info' | 'warning' | 'critical' | 'success' - 依嚴重程度分級
6. **級別樣式** - 自動根據級別應用對應顏色（對應 global.css 的 info/warning/danger/success）
7. **級別圖標** - 自動根據級別顯示對應圖標（info: ℹ️, warning: ⚠️, critical: 🚨, success: ✅）

### 警告內容結構
8. **警告標題** - `warningTitle` (string) - 警告項目的標題
9. **警告訊息** - `warningMessage` (string) - 詳細的警告訊息內容
10. **附加資料** - `warningData` (Record<string, any>) - 鍵值對形式的附加資料
11. **系統名稱** - `systemName` (string) - 來源系統名稱
12. **公告人** - `warningCreator` (string[]) - 公告人列表（陣列形式）
13. **建立時間** - `createdAt` (string) - ISO 格式的建立時間
14. **過期時間** - `expiresAt` (string) - ISO 格式的過期時間（可選）

### 自動化功能
15. **過期過濾** - 自動過濾掉已過期的警告項目
16. **時間格式化** - 自動格式化時間顯示（中文格式：月 日 時:分）
17. **項目計數** - 自動顯示有效警告項目數量
18. **網格佈局** - `bannerGrid` - 響應式網格佈局，自動適應螢幕大小

### 特殊結構
19. **標題區域** - `bannerHeader` - 包含「系統警告」標題和項目計數
20. **卡片結構** - 每個警告項目包含：header（圖標、標題、時間、關閉按鈕）、content（訊息、資料）、footer（公告人）
21. **時間戳記** - 顯示警告建立時間
22. **關閉按鈕** - 每個警告卡片都有獨立的關閉按鈕

---

## 相同或類似的功能對比

| 功能 | Card | WarningBanner | 差異說明 |
|------|------|---------------|----------|
| **尺寸控制** | `size: 'small' \| 'medium' \| 'large'` | `size: 'large' \| 'medium' \| 'small'` | 相同功能，但預設值不同（Card 預設 medium，WarningBanner 預設 large） |
| **點擊事件** | `onClick` (單一函數) | `onItemClick` (接收 item 參數) | WarningBanner 需要傳遞警告項目資料，更符合業務需求 |
| **圖標顯示** | `icon` (自定義) | 自動根據 `warningLevel` 顯示 | Card 可自定義任意圖標，WarningBanner 自動映射語義化圖標 |
| **標題顯示** | `title` (簡單字串) | `warningTitle` (警告標題) | 相同概念，但 WarningBanner 有更完整的結構（包含系統名稱） |
| **顏色系統** | `borderColor` (多種顏色選項) | `warningLevel` (對應 global.css 顏色) | Card 可自由選擇顏色，WarningBanner 綁定語義化級別 |
| **響應式設計** | 支援 | 支援 | 兩者都支援響應式佈局，自動適應不同螢幕尺寸 |

---

## 為什麼要分開設計？

### 1. 職責分離 (Separation of Concerns)

**Card Component**
- **定位**：通用容器組件
- **職責**：提供可重用的卡片容器與樣式選項
- **適用場景**：KPI 卡片、資訊卡片、功能卡片、內容展示等通用場景
- **設計理念**：保持組件的通用性和靈活性

**WarningBanner Component**
- **定位**：業務邏輯組件
- **職責**：專門處理警告/通知的顯示與管理
- **適用場景**：系統警告、通知橫幅、公告訊息等特定業務場景
- **設計理念**：封裝業務邏輯，提供開箱即用的警告系統

### 2. 資料結構差異

**Card**
- **資料模型**：單一項目，接收 `children` 和簡單 props
- **靈活性**：可容納任意內容，不限制資料結構
- **使用方式**：直接傳入內容和配置

**WarningBanner**
- **資料模型**：多項目陣列，每個項目包含完整的警告資訊
- **結構化**：每個項目包含 id、level、title、message、data、creator、時間等
- **使用方式**：傳入結構化的警告項目陣列

### 3. 業務邏輯差異

**Card**
- **業務邏輯**：無業務邏輯，純展示組件
- **狀態控制**：僅提供 loading、disabled 等基礎狀態
- **職責**：專注於樣式和佈局

**WarningBanner**
- **業務邏輯**：內建完整的警告管理邏輯
  - 過期檢查 (`isExpired`)
  - 時間格式化 (`formatTime`)
  - 項目過濾 (`validItems`)
  - 級別映射（level → 顏色/圖標）
- **職責**：封裝警告系統的完整功能

### 4. 使用場景差異

**Card**
- **通用場景**：KPI 指標、功能卡片、內容卡片、連結卡片等
- **可組合性**：可與其他組件組合使用
- **靈活性**：適用於各種不同的業務場景

**WarningBanner**
- **特定場景**：系統警告、通知公告、重要訊息等
- **完整性**：包含標題區域、項目計數、關閉功能等完整功能
- **專業性**：針對警告/通知場景進行專門優化

### 5. 擴展性考量

**Card**
- **高度可擴展**：可添加任意 props 和功能
- **不綁定業務**：可應用於各種業務場景
- **維護簡單**：功能單一，變更影響範圍小

**WarningBanner**
- **專注警告系統**：針對警告/通知場景優化
- **語義化設計**：使用 `warningLevel` 而非通用顏色
- **易於擴展**：新增警告類型只需修改映射關係

### 6. 維護性

**Card**
- **維護簡單**：功能單一，變更影響範圍小
- **測試容易**：純展示組件，測試簡單
- **重用性高**：可在多個場景使用

**WarningBanner**
- **業務邏輯集中**：警告相關邏輯集中管理
- **易於擴展**：新增警告類型只需修改映射
- **專業性強**：針對警告系統的專業設計

---

## 設計原則總結

### 1. 單一職責原則 (Single Responsibility Principle)
- **Card**：負責提供通用的卡片容器
- **WarningBanner**：負責警告系統的完整功能

### 2. 可重用性 (Reusability)
- **Card**：可在多個場景使用，高度可重用
- **WarningBanner**：專注警告場景，提供專業功能

### 3. 語義化設計 (Semantic Design)
- **Card**：使用通用的顏色和樣式選項
- **WarningBanner**：使用語義化的 `warningLevel`，更符合業務語義

### 4. 業務邏輯封裝 (Business Logic Encapsulation)
- **Card**：保持純展示，不包含業務邏輯
- **WarningBanner**：封裝警告相關的業務邏輯

### 5. 擴展性 (Extensibility)
- **Card**：可獨立擴展，不影響其他組件
- **WarningBanner**：可獨立擴展警告功能，不影響通用組件

---

## 使用範例

### Card Component 使用範例

```typescript
// 基本使用
<Card>
  <p>卡片內容</p>
</Card>

// KPI 卡片
<Card
  variant="default"
  size="medium"
  borderColor="blue"
  icon="🔧"
  iconPosition="left"
  iconSize="medium"
  isClickable={true}
  onClick={() => console.log('點擊')}
>
  <div className={styles.kpiContent}>
    <div className={styles.kpiTitle}>維修中案件</div>
    <div className={styles.kpiValue}>24</div>
    <div className={styles.kpiChange}>+12%</div>
  </div>
</Card>

// 帶連結的卡片
<Card
  href="/some-page"
  title="卡片標題"
  subtitle="副標題"
  icon="📊"
  borderColor="primary"
>
  <p>卡片內容</p>
</Card>

// 帶載入狀態的卡片
<Card
  loading={true}
  title="載入中..."
>
  <p>內容</p>
</Card>

// 帶角標和操作按鈕的卡片
<Card
  title="標題"
  badge={<span className={styles.badge}>New</span>}
  actions={
    <button onClick={handleAction}>操作</button>
  }
>
  <p>內容</p>
</Card>
```

### WarningBanner Component 使用範例

```typescript
// 基本使用
const warningItems: WarningBannerItem[] = [
  {
    id: 'warning-001',
    systemName: 'attendance',
    warningLevel: 'critical',
    warningTitle: '考勤異常警告',
    warningMessage: '今日有 5 名員工未完成打卡，請立即處理',
    warningData: {
      '未打卡人數': 5,
      '部門': '資訊部、人事部'
    },
    warningCreator: ['系統管理員', '人事主管'],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }
];

<WarningBanner
  items={warningItems}
  size="medium"
  onItemClick={(item) => console.log('點擊警告:', item)}
  onDismiss={(itemId) => console.log('關閉警告:', itemId)}
/>
```

---

## 總結

Card 和 WarningBanner 雖然在某些功能上有相似之處，但它們的設計目標和使用場景完全不同：

- **Card** 是一個通用的、可重用的容器組件，適用於各種場景
- **WarningBanner** 是一個專門的業務組件，針對警告/通知系統進行了深度優化

這種分離設計符合 React 組件設計的最佳實踐，既保持了 Card 的通用性和靈活性，又讓 WarningBanner 能夠專注於警告/通知場景，提供更好的開發體驗和使用體驗。
