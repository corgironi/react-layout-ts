# SSO 功能關閉指南

## 問題描述

當 Keycloak 配置不完整或本地開發環境沒有 Keycloak 服務時，會遇到以下錯誤：
- `The configuration object is missing the required 'url' property`
- 登入頁面無法正常顯示
- 應用程式無法啟動

## 解決方案

### 方法 1：設置環境變數（推薦）

創建 `.env` 文件在專案根目錄：

```bash
# 應用程式 API URL
VITE_APP_URL=http://localhost:8080

# SSO 開關控制（設為 false 可完全關閉 SSO 功能）
VITE_SSO_ENABLED=false

# Keycloak SSO 配置（只有當 VITE_SSO_ENABLED=true 時才需要）
# VITE_KEYCLOAK_URL=https://your-keycloak-server.com/auth
# VITE_KEYCLOAK_REALM=your-realm
# VITE_KEYCLOAK_CLIENT_ID=your-client-id
```

### 方法 2：完全移除環境變數

如果不設置 `VITE_KEYCLOAK_URL`，系統會自動關閉 SSO 功能：

```bash
# 應用程式 API URL
VITE_APP_URL=http://localhost:8080

# 不設置 Keycloak 相關環境變數，SSO 會自動關閉
```

## 修改內容說明

### 1. useKeycloak Hook 改進

- 添加了 `SSO_ENABLED` 檢查機制
- 當 SSO 關閉時跳過 Keycloak 初始化
- 提供 `ssoEnabled` 狀態供組件使用

```typescript
// 自動檢測 SSO 是否啟用
const SSO_ENABLED = import.meta.env.VITE_SSO_ENABLED !== 'false' && !!keycloakConfig.url;

// 條件式創建 Keycloak 實例
if (SSO_ENABLED) {
  keycloak = new Keycloak(keycloakConfig);
}
```

### 2. LoginPage 條件式顯示

- 只有在 SSO 啟用時才顯示 SSO 登入按鈕
- 顯示友好的狀態提示信息
- 保持本地登入功能完整可用

```typescript
// 條件式顯示 SSO 選項
{ssoEnabled && (
  <button onClick={handleSSOLogin}>
    使用 SSO 登入
  </button>
)}
```

### 3. 錯誤處理改進

- Keycloak 初始化失敗時自動降級為本地模式
- 不會阻止應用程式正常運行
- 提供清楚的錯誤日誌

## 重新啟用 SSO

當需要重新啟用 SSO 時，只需要：

1. 設置正確的環境變數：
```bash
VITE_SSO_ENABLED=true
VITE_KEYCLOAK_URL=https://your-keycloak-server.com/auth
VITE_KEYCLOAK_REALM=your-realm
VITE_KEYCLOAK_CLIENT_ID=your-client-id
```

2. 重新啟動開發伺服器：
```bash
npm run dev
```

## 驗證

重新啟動應用程式後，你應該會看到：

### SSO 關閉時：
- 只顯示本地登入表單
- 顯示「SSO 功能目前未配置」提示
- 無 SSO 登入按鈕

### SSO 啟用時：
- 顯示本地登入表單
- 顯示「或」分隔線
- 顯示 SSO 登入按鈕

## 相關檔案

- `src/hooks/useKeycloak.ts` - SSO 開關邏輯
- `src/pages/LoginPage.tsx` - 條件式 UI 顯示
- `src/config/keycloak.config.ts` - Keycloak 配置
- `.env` - 環境變數配置

## 注意事項

1. **環境變數變更後需重啟**：修改 `.env` 文件後需要重新啟動開發伺服器
2. **生產環境配置**：生產環境需要設置對應的環境變數
3. **測試覆蓋**：確保測試涵蓋 SSO 開啟和關閉兩種情況 