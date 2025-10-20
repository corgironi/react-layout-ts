# SSO Token 刷新與 Keycloak 登出指南

## 問題描述

在 SSO 登入後，當用戶重新整理頁面時，如果 Keycloak 的 SSO token 過期，會導致應用程式無法正常運作。此外，登出時需要確保 Keycloak 伺服器端的 session 也被正確清除。

## 解決方案

### 1. SSO Token 自動刷新機制

#### 1.1 useKeycloak Hook 改善
- **自動刷新**：每 30 秒檢查 token 是否需要刷新（在過期前 70 秒刷新）
- **手動刷新**：提供 `refreshSSOToken` 方法供手動刷新
- **狀態檢查**：提供 `isTokenValid` 方法檢查 token 有效性
- **全域存取**：將 Keycloak 實例暴露到 `window.__keycloak_instance`

```typescript
// 自動刷新機制
const setupTokenRefresh = () => {
  const refreshInterval = setInterval(async () => {
    try {
      const refreshed = await keycloak.updateToken(70);
      if (refreshed) {
        console.log('SSO token 已自動刷新');
        // 更新 localStorage 中的 SSO tokens
        localStorage.setItem('sso_idtoken', keycloak.idToken || '');
        localStorage.setItem('sso_accesstoken', keycloak.token || '');
        localStorage.setItem('sso_refreshtoken', keycloak.refreshToken || '');
      }
    } catch (error) {
      // 處理刷新失敗
      clearSSOTokens();
      setIsAuthenticated(false);
      window.location.href = '/login';
    }
  }, 30000);
};
```

#### 1.2 API 攔截器整合
- **401 錯誤處理**：當收到 401 錯誤時，自動嘗試刷新 SSO token
- **智能重試**：先刷新 SSO token，再重新獲取應用 token
- **失敗處理**：如果 SSO token 無法刷新，清除所有 tokens 並重定向到登入頁

```typescript
// API 攔截器中的 SSO token 刷新
if (ssoIdToken && ssoAccessToken) {
  // 先嘗試刷新 SSO token
  const ssoRefreshed = await refreshSSOTokenIfNeeded();
  
  if (ssoRefreshed) {
    console.log('SSO token 刷新成功，重新獲取應用 token');
  }
  
  // 重新獲取應用 token
  const response = await authAPI.ssoLogin();
  // 更新並重試原始請求
}
```

#### 1.3 useAuthStore 整合
在 `checkAuth` 方法中整合 SSO token 檢查：

```typescript
// 在檢查應用 token 前，先確保 SSO token 有效
const keycloak = window.__keycloak_instance;
if (keycloak) {
  try {
    const ssoRefreshed = await keycloak.updateToken(30);
    if (ssoRefreshed) {
      // 更新 localStorage 中的 SSO tokens
    }
  } catch (ssoError) {
    // SSO token 過期，清除所有 tokens
    clearAllTokens();
    return false;
  }
}
```

### 2. 完整的 Keycloak 登出機制

#### 2.1 useKeycloak Hook 的登出方法
```typescript
const logout = async () => {
  try {
    // 先清除本地 tokens
    localStorage.removeItem('sso_idtoken');
    localStorage.removeItem('sso_accesstoken');
    localStorage.removeItem('sso_refreshtoken');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('preLoginType');
    
    // 呼叫 Keycloak 登出，清除伺服器端 session
    await keycloak.logout({
      redirectUri: window.location.origin + '/login'
    });
  } catch (error) {
    // 即使失敗也要清除本地 tokens
    // 清除邏輯...
  }
};
```

#### 2.2 useAuthStore 的整合登出
```typescript
const logout = async () => {
  try {
    const { authType } = get();
    
    // 呼叫後端登出 API
    await authAPI.logout();
    
    // 如果是 SSO 登入，額外呼叫 Keycloak 登出
    if (authType === 'sso') {
      const keycloak = window.__keycloak_instance;
      if (keycloak) {
        await keycloak.logout({
          redirectUri: window.location.origin + '/login'
        });
      }
    }
    
    clearAllTokens();
  } catch (error) {
    // 錯誤處理
  }
};
```

## 使用方式

### 1. 基本使用
SSO token 刷新機制會自動運行，無需額外操作。

### 2. 手動刷新 SSO Token
```typescript
const { refreshSSOToken } = useKeycloak();

// 手動刷新
const success = await refreshSSOToken();
if (success) {
  console.log('SSO token 刷新成功');
}
```

### 3. 檢查 Token 狀態
```typescript
const { isTokenValid } = useKeycloak();

if (isTokenValid()) {
  console.log('SSO token 有效');
} else {
  console.log('SSO token 無效或已過期');
}
```

### 4. 完整登出
```typescript
const { logout } = useAuthStore();

// 這會同時清除本地和伺服器端的 session
await logout();
```

## 機制流程圖

```
用戶重新整理頁面
       ↓
  checkAuth() 被調用
       ↓
  檢查 SSO token 是否需要刷新
       ↓
   [需要刷新] → 呼叫 keycloak.updateToken()
       ↓
   [刷新成功] → 更新 localStorage
       ↓
   嘗試刷新應用 token
       ↓
   [成功] → 繼續正常運作
       ↓
   [失敗] → 重新獲取應用 token
       ↓
   [最終失敗] → 清除所有 tokens，重定向到登入頁
```

## 優勢

1. **自動化**：無需手動處理 token 刷新
2. **健壯性**：多層錯誤處理和回退機制
3. **安全性**：確保伺服器端 session 正確清除
4. **用戶體驗**：減少因 token 過期導致的登入中斷
5. **透明性**：對業務邏輯透明，無需修改現有代碼

## 注意事項

1. **刷新頻率**：目前設定為每 30 秒檢查一次，可根據需求調整
2. **過期時間**：在 token 過期前 70 秒進行刷新，確保充足的緩衝時間
3. **錯誤處理**：當 SSO refresh token 也過期時，會清除所有 tokens 並重定向
4. **環境配置**：確保 Keycloak 配置正確，包括 URL、realm、clientId 等

## 相關檔案

- `src/hooks/useKeycloak.ts` - Keycloak hook 實作
- `src/api/api.ts` - API 攔截器和 SSO token 刷新
- `src/store/useAuthStore.ts` - 認證狀態管理
- `src/config/keycloak.config.ts` - Keycloak 配置

## 測試建議

1. **Token 過期測試**：手動調整 token 過期時間測試自動刷新
2. **網路中斷測試**：測試網路中斷時的錯誤處理
3. **頁面重新整理測試**：確保重新整理後認證狀態正確
4. **登出測試**：確認伺服器端 session 正確清除 