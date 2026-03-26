# Pagination 共用元件說明

## 檔案位置

- 元件：`src/components/Pagination.tsx`
- 樣式：`src/components/Pagination.module.css`
- 主題變數：`src/styles/global.css`

## 功能

- 顯示頁碼（包含省略號）
- 支援「最前頁」、「上一頁」、「下一頁」、「最後頁」
- 支援亮色/暗色主題
- 響應式：手機版會自動換行並置中

## Props

```ts
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  siblingCount?: number;
}
```

- `currentPage`: 目前頁碼（從 1 開始）
- `totalPages`: 總頁數
- `onPageChange`: 切頁 callback
- `className`: 自訂 class（選用）
- `siblingCount`: 目前頁左右要顯示幾個頁碼（預設 `1`）

## 基本使用方式

```tsx
import { useMemo, useState } from 'react';
import Pagination from '../../components/Pagination';

const Example = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const data = Array.from({ length: 95 }, (_, i) => `item-${i + 1}`);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  const pageData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [currentPage, data]);

  return (
    <div>
      <ul>
        {pageData.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
```

## 在 HWMAHome 的實作

`src/pages/HardwareMaintenance/HWMAHome.tsx` 已接入：

1. `filteredOrders` 做搜尋/狀態篩選
2. `paginatedOrders` 根據 `currentPage` 與 `ITEMS_PER_PAGE` 分頁
3. 表格使用 `paginatedOrders` 渲染
4. 底部使用 `Pagination` 控制切頁

## 主題樣式變數

在 `src/styles/global.css` 新增：

- `--pagination-bg`
- `--pagination-border`
- `--pagination-text`

元件會自動跟著 `[data-theme='light']` 與 `[data-theme='dark']` 切換。
