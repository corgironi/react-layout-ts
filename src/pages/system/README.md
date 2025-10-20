# 系統設定頁面

此頁面提供系統管理功能，包括使用者管理等。

## 功能特色

### 創建使用者
- 路由：`/system/createuser`
- 功能：創建本地使用者帳號
- 表單欄位：
  - 帳號：使用者登入帳號
  - 工號：員工識別編號
  - 姓名：使用者真實姓名
  - 廠區：工作地點（A廠、B廠、C廠、總部）

## 技術實作

### 路由配置
```typescript
{
  path: 'system',
  element: <SystemPage />,
  children: [
    {
      path: 'createuser',
      element: <CreateLocalUser />
    }
  ]
}
```

### API 端點
- `POST /user/create` - 創建新使用者
- 請求格式：
```json
{
  "username": "string",
  "employeeId": "string", 
  "name": "string",
  "site": "string"
}
```

## 樣式設計

- 使用主題色彩變數（`--primary`、`--card-bg`、`--text-primary` 等）
- 響應式設計，支援行動裝置
- 與 attendance 頁面保持一致的視覺風格

## 使用方式

1. 在側邊欄點擊「系統設定」
2. 選擇「創建使用者」標籤
3. 填寫必要欄位
4. 點擊「創建使用者」按鈕
5. 系統會顯示成功或失敗訊息

## 擴展性

可以在 `SystemPage.tsx` 中添加更多 tab，例如：
- 使用者管理
- 權限設定
- 系統配置
- 資料備份

每個新功能只需要：
1. 創建對應的頁面組件
2. 在路由中添加子路由
3. 在 SystemPage 中添加 tab 按鈕 