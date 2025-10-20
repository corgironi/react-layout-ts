# 統一登出機制指南

## 🎯 設計原則

### 統一入口
- **主要登出方法**：`useAuthStore.logout()` - 所有登出操作的統一入口
- **專用方法**：`useKeycloak.logout()` - 僅處理 Keycloak 特定的登出邏輯

### 分層責任
1. **useAuthStore.logout()** - 整體登出流程控制
2. **useKeycloak.logout()** - Keycloak 特定的登出處理
3. **authAPI.logout()** - 後端 API 登出
4. **clearAllTokens()** - 本地儲存清理

## 🔄 登出流程

### 完整流程圖
```
用戶點擊登出
       ↓
useAuthStore.logout() 被調用
       ↓
1. 呼叫後端登出 API
   ├─ 成功 → 繼續
   └─ 失敗 → 記錄錯誤但繼續流程
       ↓
2. 檢查認證類型
   ├─ 本地登入 → 跳到步驟 3
   └─ SSO 登入 → 呼叫 Keycloak 登出
       ├─ 成功 → 頁面重定向（流程結束）
       └─ 失敗 → 記錄錯誤，繼續步驟 3
       ↓
3. 清除所有本地狀態
       ↓
4. 更新應用程式狀態
       ↓
登出完成
```

## 📝 實作詳情

### 1. useAuthStore.logout()
```typescript
logout: async () => {
  try {
    const { authType } = get();
    
    // 1. 後端 API 登出（容錯處理）
    try {
      await authAPI.logout();
    } catch (backendError) {
      console.error('後端登出失敗，但繼續流程');
    }
    
    // 2. SSO 特殊處理
    if (authType === 'sso') {
      const keycloak = window.__keycloak_instance;
      if (keycloak && keycloak.authenticated) {
        // 先清除本地狀態，避免重定向前的不一致
        clearAllTokens();
        set({ isAuthenticated: false, user: null, authType: null });
        
        // Keycloak 登出（會重定向）
        await keycloak.logout({ redirectUri: '/login' });
        return; // 重定向後不會執行到這裡
      }
    }
    
    // 3. 本地清理
    clearAllTokens();
    set({ isAuthenticated: false, user: null, authType: null });
    
  } catch (error) {
    // 緊急清理
    clearAllTokens();
    set({ isAuthenticated: false, user: null, authType: null });
    throw error;
  }
}
```

### 2. useKeycloak.logout()
```typescript
logout: async () => {
  // 專門處理 Keycloak 登出
  if (!keycloak.authenticated) return;
  
  clearSSOTokens(); // 只清除 SSO tokens
  await keycloak.logout({ redirectUri: '/login' });
}
```

### 3. clearAllTokens()
```typescript
clearAllTokens: () => {
  try {
    // 清除應用程式 tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // 清除 SSO tokens
    localStorage.removeItem('sso_idtoken');
    localStorage.removeItem('sso_accesstoken');
    localStorage.removeItem('sso_refreshtoken');
    
    // 清除預登入狀態
    setPreLoginType(null);
  } catch (error) {
    // 容錯處理
    console.error('清除失敗:', error);
  }
}
```

## 🚀 使用方式

### 主要用法（推薦）
```typescript
import useAuthStore from '../store/useAuthStore';

const { logout } = useAuthStore();

// 統一登出，自動處理所有類型
const handleLogout = async () => {
  try {
    await logout();
    // 對於本地登入，會在這裡繼續執行
    // 對於 SSO 登入，頁面會重定向，不會執行到這裡
    navigate('/login');
  } catch (error) {
    console.error('登出失敗:', error);
    // 即使失敗，本地狀態也已清除
    navigate('/login');
  }
};
```

### 直接 Keycloak 登出（特殊情況）
```typescript
import { useKeycloak } from '../hooks/useKeycloak';

const { logout: keycloakLogout } = useKeycloak();

// 只在特殊情況下直接使用
const handleKeycloakLogout = async () => {
  await keycloakLogout();
};
```

## ✅ 優勢

### 1. 統一性
- 單一入口點，減少混淆
- 一致的錯誤處理
- 標準化的登出流程

### 2. 健壯性
- 多層容錯處理
- 即使部分步驟失敗，也能完成基本清理
- 緊急清理機制

### 3. 類型安全
- 自動根據認證類型選擇適當的登出方式
- 避免本地用戶誤觸 Keycloak 登出

### 4. 維護性
- 清晰的責任分離
- 易於測試和除錯
- 良好的日誌記錄

## ⚠️ 注意事項

### 1. SSO 登出重定向
- SSO 登出會重定向頁面，登出後的代碼可能不會執行
- 需要在重定向前完成必要的狀態清理

### 2. 錯誤處理
- 即使後端 API 失敗，也要繼續本地清理
- 記錄錯誤但不阻斷登出流程

### 3. 並發安全
- 避免同時多次呼叫登出
- 確保狀態清理的原子性

## 🧪 測試建議

### 1. 本地登入測試
```typescript
// 測試本地登入用戶的登出
test('local user logout', async () => {
  // 設置本地登入狀態
  // 呼叫 logout()
  // 驗證所有 tokens 被清除
  // 驗證狀態更新
});
```

### 2. SSO 登入測試
```typescript
// 測試 SSO 用戶的登出
test('SSO user logout', async () => {
  // Mock Keycloak 實例
  // 設置 SSO 登入狀態
  // 呼叫 logout()
  // 驗證 Keycloak 登出被呼叫
  // 驗證重定向
});
```

### 3. 錯誤情況測試
```typescript
// 測試各種錯誤情況
test('logout error handling', async () => {
  // Mock API 失敗
  // Mock Keycloak 失敗
  // 驗證緊急清理機制
});
```

## 📊 與舊版本的差異

### 舊版本問題
- ❌ 多個登出入口，容易混淆
- ❌ 錯誤處理不一致
- ❌ 本地用戶可能誤觸 Keycloak 登出
- ❌ 狀態清理不完整

### 新版本改善
- ✅ 統一的登出入口
- ✅ 完整的容錯機制
- ✅ 智能的類型識別
- ✅ 徹底的狀態清理
- ✅ 清晰的責任分離

## 📊 登出流程優化對照表

### 詳細步驟說明

| 步驟 | 本地登入 | SSO 登入 | 錯誤處理 |
|------|----------|----------|----------|
| 1. 後端 API | ✅ 呼叫 `authAPI.logout()` | ✅ 呼叫 `authAPI.logout()` | 🔄 失敗也繼續流程 |
| 2. Keycloak | ❌ 跳過 | ✅ 呼叫 `keycloak.logout()` | 🔄 失敗也繼續流程 |
| 3. 本地清理 | ✅ 執行 `clearAllTokens()` | ✅ 執行 `clearAllTokens()` | 🔄 緊急清理機制 |
| 4. 狀態更新 | ✅ 更新應用狀態 | ✅ 更新應用狀態 | 🔄 強制執行 |
| 5. 重定向 | 🔄 手動導航 | ✅ 自動重定向 | 🔄 確保到達登入頁 |

### 流程特點說明

#### 本地登入登出
- **簡單直接**：只需要清除本地 tokens 和應用狀態
- **可控性高**：可以在登出後執行自定義邏輯
- **網路依賴低**：主要依賴本地操作

#### SSO 登入登出
- **伺服器端清理**：必須呼叫 Keycloak API 清除 session
- **自動重定向**：Keycloak 會自動重定向到指定頁面
- **狀態同步**：需要在重定向前完成本地狀態清理

#### 錯誤處理策略
- **容錯優先**：不因為單一步驟失敗而阻斷整個流程
- **狀態保證**：確保本地狀態一定會被清除
- **用戶體驗**：即使出現錯誤也要讓用戶能夠登出

## 💡 最佳實踐建議

### 1. 統一登出入口
```typescript
// ✅ 推薦方式：使用統一入口
import useAuthStore from '../store/useAuthStore';

const { logout } = useAuthStore();

const handleLogout = async () => {
  try {
    await logout();
    // 對於本地登入，會在這裡繼續執行
    // 對於 SSO 登入，頁面會重定向，不會執行到這裡
    navigate('/login');
  } catch (error) {
    console.error('登出失敗:', error);
    // 即使失敗，本地狀態也已清除
    navigate('/login');
  }
};
```

### 2. 避免直接呼叫 Keycloak 登出
```typescript
// ❌ 不推薦：直接使用 keycloak logout（除非特殊需求）
import { useKeycloak } from '../hooks/useKeycloak';

const { logout: keycloakLogout } = useKeycloak();

// 這可能會導致本地用戶錯誤
const handleKeycloakLogout = async () => {
  await keycloakLogout(); // 本地用戶會出錯
};
```

### 3. 登出按鈕實作
```typescript
// ✅ 完整的登出按鈕實作
const LogoutButton = () => {
  const { logout, authType } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (isLoggingOut) return; // 防止重複點擊
    
    setIsLoggingOut(true);
    
    try {
      await logout();
      
      // 只有本地登入會執行到這裡
      if (authType === 'local') {
        navigate('/login');
      }
      // SSO 登入會自動重定向，不會執行到這裡
      
    } catch (error) {
      console.error('登出失敗:', error);
      // 即使失敗也要導航到登入頁
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button 
      onClick={handleLogout} 
      disabled={isLoggingOut}
    >
      {isLoggingOut ? '登出中...' : '登出'}
    </button>
  );
};
```

### 4. 錯誤處理最佳實踐
```typescript
// ✅ 完整的錯誤處理
const handleLogout = async () => {
  try {
    await logout();
  } catch (error) {
    // 記錄錯誤但不阻止用戶登出
    console.error('登出過程出現錯誤:', error);
    
    // 顯示友好的錯誤訊息（可選）
    if (error.message !== 'Expected error during SSO logout') {
      showNotification('登出時發生錯誤，但您已成功登出', 'warning');
    }
    
    // 確保導航到登入頁
    navigate('/login');
  }
};
```

## 🔧 技術細節

### SSO 登出特殊性

#### 1. 重定向問題
```typescript
// SSO 登出會觸發頁面重定向
await keycloak.logout({
  redirectUri: window.location.origin + '/login'
});
// 注意：這行代碼可能不會執行，因為頁面已經重定向了
console.log('這行可能不會執行');
```

#### 2. 時序問題
```typescript
// ✅ 正確的時序處理
if (authType === 'sso') {
  // 先清除本地狀態，避免重定向前的狀態不一致
  clearAllTokens();
  set({ isAuthenticated: false, user: null, authType: null });
  
  // 然後觸發重定向
  await keycloak.logout({ redirectUri: '/login' });
  return; // 重定向後不會執行到這裡
}
```

#### 3. 伺服器端 Session 清除
- **必要性**：只清除本地 tokens 不會清除 Keycloak 伺服器端的 session
- **安全性**：如果不清除伺服器端 session，可能導致安全問題
- **單一登出**：Keycloak 支援 Single Sign-Out (SSO)，會同時登出所有相關應用

### 容錯設計原理

#### 1. 多層防護
```typescript
// 第一層：正常流程
try {
  await authAPI.logout();
  if (authType === 'sso') {
    await keycloak.logout();
  }
  clearAllTokens();
} 
// 第二層：錯誤處理
catch (error) {
  clearAllTokens(); // 確保本地狀態清除
} 
// 第三層：緊急清理（在 clearAllTokens 內部）
finally {
  // 即使 clearAllTokens 失敗，也要清除基本 tokens
}
```

#### 2. 狀態一致性保證
- **原子性**：要麼完全登出，要麼清除本地狀態
- **冪等性**：多次呼叫登出不會產生副作用
- **最終一致性**：即使出現錯誤，最終狀態是正確的

#### 3. 用戶體驗優化
- **非阻塞**：不因為網路錯誤而卡住登出流程
- **反饋明確**：提供清晰的登出狀態反饋
- **容錯友好**：即使出錯也要讓用戶能夠重新登入

### 性能優化

#### 1. 避免不必要的 API 呼叫
```typescript
// ✅ 智能判斷，避免無效呼叫
if (authType === 'sso' && keycloak?.authenticated) {
  await keycloak.logout();
} else {
  // 本地用戶或 Keycloak 未認證，跳過
}
```

#### 2. 並發控制
```typescript
// ✅ 防止重複登出
let isLoggingOut = false;

const logout = async () => {
  if (isLoggingOut) {
    console.log('登出已在進行中');
    return;
  }
  
  isLoggingOut = true;
  try {
    // 登出邏輯
  } finally {
    isLoggingOut = false;
  }
};
```

## 📋 遷移指南

### 現有代碼更新
```typescript
// 舊方式 - 需要自己判斷類型
const { logout: authLogout } = useAuthStore();
const { logout: keycloakLogout } = useKeycloak();

if (authType === 'sso') {
  await keycloakLogout();
} else {
  await authLogout();
}

// 新方式 - 統一入口，自動判斷
const { logout } = useAuthStore();
await logout();
```

### 常見問題解決

#### 1. 本地用戶誤觸 Keycloak 登出
```typescript
// 問題：本地用戶直接呼叫 keycloak.logout()
await keycloak.logout(); // ❌ 會導致錯誤

// 解決：使用統一登出
await logout(); // ✅ 自動判斷類型
```

#### 2. SSO 登出後頁面不重定向
```typescript
// 問題：沒有設置正確的 redirectUri
await keycloak.logout(); // ❌ 沒有重定向

// 解決：設置正確的重定向 URI
await keycloak.logout({
  redirectUri: window.location.origin + '/login'
}); // ✅ 會重定向到登入頁
```

#### 3. 登出失敗但狀態未清除
```typescript
// 問題：沒有容錯處理
try {
  await logout();
} catch (error) {
  // ❌ 什麼都不做，用戶可能還是登入狀態
}

// 解決：確保狀態清除
try {
  await logout();
} catch (error) {
  console.error('登出失敗但繼續清除狀態');
  // ✅ 即使失敗也要清除本地狀態
  clearAllTokens();
  navigate('/login');
}
```

## 📊 總結

### ✅ 現在的登出邏輯優勢

1. **類型判定是必要的** - 避免不必要的錯誤和網路請求
2. **統一入口點** - 減少開發者混淆，提高代碼一致性
3. **完整的容錯機制** - 確保在各種異常情況下都能正確登出
4. **清晰的責任分離** - 每個組件只處理自己的邏輯範圍
5. **良好的用戶體驗** - 快速、可靠的登出流程
6. **安全性保證** - 確保伺服器端 session 正確清除
7. **可維護性** - 清晰的代碼結構，易於除錯和測試

### 🎯 關鍵設計決策

1. **為什麼需要類型判定？**
   - SSO 用戶需要清除伺服器端 session
   - 本地用戶避免不必要的 Keycloak API 呼叫
   - 不同類型的登出流程有本質差異

2. **為什麼不能全部清除？**
   - 本地用戶呼叫 Keycloak API 會導致錯誤
   - 效率問題：不必要的網路請求
   - 可能導致意外的頁面重定向

3. **為什麼需要容錯設計？**
   - 網路環境不穩定
   - 伺服器可能暫時不可用
   - 用戶體驗優於技術完美性

這個統一登出機制確保了所有情況下的正確登出，並提供了更好的用戶體驗和開發者體驗。🚀 