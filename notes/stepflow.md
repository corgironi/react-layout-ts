# StepFlow Component 使用文檔

## 組件介紹

`StepFlow` 是一個用於顯示流程步驟的垂直時間軸組件，適用於展示工作流程、審批流程、維修流程等需要按順序執行的步驟。組件支援多種步驟狀態，並可為當前活動步驟配置操作按鈕。

### 主要特性

- ✅ **多種步驟狀態**：支援已完成、進行中、待處理、異常四種狀態
- ✅ **自動編號**：步驟會自動根據陣列順序顯示編號
- ✅ **視覺化連接線**：步驟之間有連接線，已完成步驟的連接線會變為綠色
- ✅ **狀態標籤**：右側顯示步驟的當前狀態（進行中、已完成、異常）
- ✅ **操作按鈕**：可為當前活動步驟配置操作按鈕
- ✅ **響應式設計**：自動適應不同螢幕尺寸
- ✅ **主題支援**：支援 Light/Dark 主題切換

---

## 屬性說明

### StepFlowProps

| 屬性 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `steps` | `StepFlowStep[]` | ✅ | - | 步驟陣列，每個元素代表一個步驟 |
| `className` | `string` | ❌ | `''` | 自定義 CSS 類名，用於額外的樣式定制 |

### StepFlowStep

| 屬性 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `id` | `string` | ✅ | - | 步驟的唯一識別碼 |
| `title` | `string` | ✅ | - | 步驟標題 |
| `comment` | `string` | ❌ | - | 步驟描述/判定內容 |
| `timestamp` | `string` | ❌ | - | 時間戳（例如：'2024-10-20 11:30'） |
| `responsible` | `string` | ❌ | - | 負責人（例如：'IT-張明'） |
| `status` | `'completed' \| 'active' \| 'pending' \| 'error'` | ✅ | - | 步驟狀態 |
| `actionButton` | `ActionButton` | ❌ | - | 操作按鈕配置（僅在 `status === 'active'` 時顯示） |

### ActionButton

| 屬性 | 類型 | 必填 | 預設值 | 說明 |
|------|------|------|--------|------|
| `label` | `string` | ✅ | - | 按鈕文字 |
| `icon` | `string` | ❌ | - | Font Awesome 圖標類名（例如：'fas fa-check'） |
| `onClick` | `() => void` | ✅ | - | 按鈕點擊事件處理函數 |
| `variant` | `'primary' \| 'warning' \| 'danger'` | ❌ | `'primary'` | 按鈕樣式變體 |

---

## 步驟狀態說明

### 1. `completed` - 已完成

- **圖標**：綠色圓圈，內含白色勾勾 ✓
- **連接線**：綠色（與下一個步驟的連接線）
- **狀態標籤**：顯示「已完成」（綠色背景）
- **使用場景**：步驟已成功完成

### 2. `active` - 進行中

- **圖標**：紫色圓圈，顯示步驟編號
- **連接線**：灰色（與下一個步驟的連接線）
- **狀態標籤**：顯示「進行中」（紫色背景）
- **操作按鈕**：可配置操作按鈕，僅在此狀態下顯示
- **使用場景**：當前正在處理的步驟

### 3. `pending` - 待處理

- **圖標**：灰色圓圈，顯示步驟編號
- **連接線**：灰色（與下一個步驟的連接線）
- **狀態標籤**：不顯示
- **使用場景**：尚未開始的步驟

### 4. `error` - 異常

- **圖標**：紅色圓圈，內含白色 X
- **連接線**：灰色（與下一個步驟的連接線）
- **狀態標籤**：顯示「異常」（紅色背景）
- **使用場景**：步驟執行過程中發生錯誤

---

## 使用範例

### 基本使用

```typescript
import StepFlow, { StepFlowStep } from '../../components/StepFlow';

const steps: StepFlowStep[] = [
  {
    id: 'step-1',
    title: '初步檢測',
    comment: '判定硬體故障',
    timestamp: '2024-10-20 11:30',
    responsible: 'IT-張明',
    status: 'completed',
  },
  {
    id: 'step-2',
    title: '廠商判定項目',
    comment: '需更換螢幕排線、記憶體升級',
    timestamp: '2024-10-21 12:30',
    responsible: '廠商-王工程師',
    status: 'completed',
  },
  {
    id: 'step-3',
    title: '費用及報價階段',
    comment: '請選擇付款方式',
    timestamp: '2024-10-22 13:30',
    responsible: '待選擇',
    status: 'active',
    actionButton: {
      label: '選擇付款方式',
      icon: 'fas fa-dollar-sign',
      onClick: () => {
        console.log('選擇付款方式');
      },
      variant: 'primary',
    },
  },
  {
    id: 'step-4',
    title: '維修進行中',
    comment: '維修進行中',
    status: 'pending',
  },
];

<StepFlow steps={steps} />
```

### 帶有異常狀態的流程

```typescript
const steps: StepFlowStep[] = [
  {
    id: 'step-1',
    title: '提交申請',
    comment: '申請已提交',
    timestamp: '2024-10-20 09:00',
    responsible: '申請人-張三',
    status: 'completed',
  },
  {
    id: 'step-2',
    title: '審核中',
    comment: '審核過程中發現資料不完整',
    timestamp: '2024-10-20 14:00',
    responsible: '審核人-李四',
    status: 'error',
  },
  {
    id: 'step-3',
    title: '重新提交',
    comment: '請補充相關資料',
    timestamp: '2024-10-21 10:00',
    responsible: '待處理',
    status: 'active',
    actionButton: {
      label: '補充資料',
      icon: 'fas fa-edit',
      onClick: () => {
        // 處理補充資料邏輯
      },
      variant: 'warning',
    },
  },
];

<StepFlow steps={steps} />
```

### 不同按鈕樣式的使用

```typescript
const steps: StepFlowStep[] = [
  {
    id: 'step-1',
    title: '審批流程',
    status: 'active',
    actionButton: {
      label: '確認審批',
      icon: 'fas fa-check',
      onClick: handleApprove,
      variant: 'primary', // 紫色按鈕（預設）
    },
  },
  {
    id: 'step-2',
    title: '等待審批',
    status: 'active',
    actionButton: {
      label: '延遲處理',
      icon: 'fas fa-clock',
      onClick: handleDelay,
      variant: 'warning', // 黃色按鈕
    },
  },
  {
    id: 'step-3',
    title: '異常處理',
    status: 'active',
    actionButton: {
      label: '取消流程',
      icon: 'fas fa-times',
      onClick: handleCancel,
      variant: 'danger', // 紅色按鈕
    },
  },
];

<StepFlow steps={steps} />
```

### 自定義樣式

```typescript
<StepFlow 
  steps={steps} 
  className={styles.customStepFlow}
/>
```

```css
/* 在 CSS 文件中 */
.customStepFlow {
  padding: 2rem 0;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
}
```

---

## 完整範例：維修流程頁面

```typescript
import { useParams } from 'react-router';
import StepFlow, { StepFlowStep } from '../../components/StepFlow';
import styles from './RepairFlow.module.css';

const RepairFlow = () => {
  const { rid } = useParams<{ rid: string }>();

  const steps: StepFlowStep[] = [
    {
      id: 'step-1',
      title: '初步檢測',
      comment: '判定硬體故障',
      timestamp: '2024-10-20 11:30',
      responsible: 'IT-張明',
      status: 'completed',
    },
    {
      id: 'step-2',
      title: '廠商判定項目',
      comment: '需更換螢幕排線、記憶體升級',
      timestamp: '2024-10-21 12:30',
      responsible: '廠商-王工程師',
      status: 'completed',
    },
    {
      id: 'step-3',
      title: '費用及報價階段',
      comment: '請選擇付款方式',
      timestamp: '2024-10-22 13:30',
      responsible: '待選擇',
      status: 'active',
      actionButton: {
        label: '選擇付款方式',
        icon: 'fas fa-dollar-sign',
        onClick: () => {
          // 處理選擇付款方式
          console.log('選擇付款方式');
        },
        variant: 'primary',
      },
    },
    {
      id: 'step-4',
      title: '維修進行中',
      comment: '維修進行中',
      status: 'pending',
    },
  ];

  return (
    <div className={styles.container}>
      <h1>維修流程 - {rid}</h1>
      
      <div className={styles.flowSection}>
        <h2>維修流程進度</h2>
        <StepFlow steps={steps} />
      </div>
    </div>
  );
};

export default RepairFlow;
```

---

## 樣式定制

### CSS 變數

組件使用以下 CSS 變數，可在 `global.css` 中自定義：

- `--primary`: 主要顏色（活動步驟圖標、狀態標籤）
- `--primary-rgb`: 主要顏色的 RGB 值（用於透明度）
- `--success`: 成功顏色（已完成步驟圖標、連接線）
- `--success-rgb`: 成功顏色的 RGB 值
- `--danger`: 危險顏色（異常步驟圖標、狀態標籤）
- `--danger-rgb`: 危險顏色的 RGB 值
- `--warning`: 警告顏色（警告按鈕）
- `--warning-rgb`: 警告顏色的 RGB 值
- `--border`: 邊框顏色（待處理步驟圖標、連接線）
- `--text-primary`: 主要文字顏色
- `--text-secondary`: 次要文字顏色

### 可用的 CSS 類名

| 類名 | 說明 |
|------|------|
| `.stepFlow` | 流程容器 |
| `.stepItem` | 單個步驟容器 |
| `.stepIcon` | 步驟圖標 |
| `.stepIconCompleted` | 已完成步驟圖標 |
| `.stepIconActive` | 活動步驟圖標 |
| `.stepIconPending` | 待處理步驟圖標 |
| `.stepIconError` | 異常步驟圖標 |
| `.stepConnector` | 步驟連接線 |
| `.stepContent` | 步驟內容區域 |
| `.stepTitle` | 步驟標題 |
| `.stepComment` | 步驟描述 |
| `.statusBadge` | 狀態標籤 |
| `.actionButton` | 操作按鈕 |

---

## 注意事項

1. **步驟順序**：步驟會按照陣列順序自動編號，第一個步驟為 1，第二個為 2，依此類推。

2. **操作按鈕**：操作按鈕僅在 `status === 'active'` 的步驟中顯示。如果步驟不是活動狀態，即使配置了 `actionButton` 也不會顯示。

3. **連接線顏色**：連接線的顏色取決於當前步驟的狀態：
   - 如果步驟是 `completed`，連接線為綠色
   - 其他狀態的連接線為灰色

4. **狀態標籤**：狀態標籤僅在 `active`、`completed`、`error` 狀態下顯示，`pending` 狀態不顯示標籤。

5. **響應式設計**：在手機版（螢幕寬度 < 768px）時，圖標和文字會自動縮小，操作按鈕會變為全寬。

6. **圖標使用**：`actionButton.icon` 需要使用 Font Awesome 圖標類名，例如：
   - `'fas fa-check'` - 勾勾圖標
   - `'fas fa-dollar-sign'` - 美元符號
   - `'fas fa-clock'` - 時鐘圖標
   - `'fas fa-times'` - X 圖標

---

## 最佳實踐

1. **步驟 ID**：建議使用有意義的 ID，例如 `'step-initial-check'` 而不是 `'step-1'`，這樣更容易維護。

2. **時間戳格式**：建議使用統一的時間戳格式，例如 `'YYYY-MM-DD HH:mm'`。

3. **負責人格式**：建議使用統一的負責人格式，例如 `'部門-姓名'` 或 `'角色-姓名'`。

4. **狀態管理**：建議將步驟狀態與業務邏輯綁定，當步驟完成時更新狀態，而不是硬編碼。

5. **操作按鈕**：操作按鈕的 `onClick` 函數應該處理實際的業務邏輯，例如打開 Modal、調用 API 等。

---

## 與其他組件的配合使用

### 與 Card 組件配合

```typescript
import Card from '../../components/Card';
import StepFlow from '../../components/StepFlow';

<div className={styles.container}>
  <Card title="流程進度" padding="large">
    <StepFlow steps={steps} />
  </Card>
</div>
```

### 與 WarningBanner 組件配合

```typescript
import WarningBanner from '../../components/WarningBanner';
import StepFlow from '../../components/StepFlow';

<div className={styles.container}>
  <WarningBanner items={warnings} size="medium" />
  <StepFlow steps={steps} />
</div>
```

---

## 總結

`StepFlow` 組件是一個功能完整、易於使用的流程展示組件，適用於各種需要展示步驟流程的場景。通過簡單的配置，即可創建出美觀、功能完整的流程圖。

主要優勢：
- ✅ 開箱即用，無需額外配置
- ✅ 支援多種狀態，滿足各種業務需求
- ✅ 響應式設計，適配各種設備
- ✅ 主題支援，自動適應 Light/Dark 模式
- ✅ 高度可定制，支援自定義樣式
