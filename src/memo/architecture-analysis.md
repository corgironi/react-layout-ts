# 認證系統架構分析

我們的認證系統採用分層架構設計，每一層都有明確的職責。

## 三層架構概述

```
UI Components (Header, HomePage, LoginPage...)
        ↓ 使用
useAuth Hook (UI業務邏輯)
        ↓ 調用
useAuthStore (狀態管理)
        ↓ 調用
API Layer (資料獲取)
```

## 詳細職責分析

### 1. API Layer - 資料存取層

職責：純粹的網路請求和資料處理

```typescript
const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/login', { username, password });
    return response.data; // 純資料返回
  },
  
  getUserProfile: async () => {
    const response = await api.get('/user/profile');
    return response.data;
  }
}
```

特點：
- ✅ 無狀態 (stateless)
- ✅ 純函數式
- ✅ 只處理 HTTP 請求/響應
- ✅ 不知道應用的業務邏輯

不負責：
- ❌ 狀態管理
- ❌ 路由導航
- ❌ UI 邏輯
- ❌ 業務規則

### 2. useAuthStore - 狀態管理層

職責：認證狀態管理和核心認證邏輯

```typescript
export const useAuthStore = create((set, get) => ({
  // 狀態管理
  isAuthenticated: false,
  user: null,
  authType: null,
  
  // 業務邏輯實現
  login: async (username, password) => {
    try {
      // 1. 調用 API 獲取資料
      const response = await authAPI.login(username, password);
      
      // 2. 處理業務邏輯（token 存儲、user profile 獲取）
      localStorage.setItem('access_token', response.access_token);
      
      // 3. 獲取用戶詳細資料
      try {
        const user = await authAPI.getUserProfile();
        set({ 
          isAuthenticated: true, 
          user: { ...user, authType: 'local' },
          authType: 'local'
        });
      } catch (profileError) {
        // 錯誤處理和回退邏輯
      }
    } catch (error) {
      console.error('登入失敗:', error);
      throw error;
    }
  }
}));
```

負責：
- ✅ 全域狀態管理
- ✅ 認證核心業務邏輯
- ✅ token 管理
- ✅ 錯誤處理
- ✅ 自動持久化

不負責：
- ❌ UI 相關邏輯
- ❌ 路由導航
- ❌ 載入狀態顯示
- ❌ 使用者互動

### 3. useAuth Hook - UI業務邏輯層

職責：UI 導向的業務邏輯和增強功能

```typescript
export const useAuth = () => {
  const { isAuthenticated, user, login, logout, checkAuth } = useAuthStore();
  const navigate = useNavigate();

  // SWR 增強資料管理
  const { data: userData, error, mutate } = useSWR(
    isAuthenticated ? '/user/profile' : null,
    profileFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      onSuccess: (data) => setUser(data),
      onError: (err) => checkAuth()
    }
  );

  // 自動 Token 刷新
  useEffect(() => {
    if (!isAuthenticated) return;
    
    checkAuth();
    const intervalId = setInterval(() => {
      checkAuth();
    }, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, checkAuth]);

  // UI 友好的登入函數
  const handleLogin = useCallback(async (username, password) => {
    try {
      await login(username, password); // 調用 Store
      mutate(); // 重新獲取資料
      navigate('/'); // 導航到首頁
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false; // 返回 UI 友好的結果
    }
  }, [login, navigate, mutate]);

  // UI 友好的登出函數
  const handleLogout = useCallback(async () => {
    await logout(); // 調用 Store
    navigate('/login'); // 導航到登入頁
  }, [logout, navigate]);

  return {
    isAuthenticated,
    user: user || userData,
    isLoading: !error && !userData && isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    refreshUser: mutate
  };
};
```

負責：
- ✅ 路由導航
- ✅ 載入狀態
- ✅ 自動刷新
- ✅ 資料快取
- ✅ UI 互動邏輯

不負責：
- ❌ 核心認證邏輯
- ❌ 狀態持久化
- ❌ API 請求細節

## 完整流程示例

用戶登入流程：

```typescript
// 1. UI 組件觸發
const LoginPage = () => {
  const { login, isLoading } = useAuth(); // 使用 Hook
  
  const handleSubmit = async (username, password) => {
    const success = await login(username, password);
    if (success) {
      // 成功後的 UI 回饋
    }
  };
};

// 2. Hook 處理 UI 邏輯
const handleLogin = async (username, password) => {
  try {
    await login(username, password); // 調用 Store
    mutate(); // 刷新快取
    navigate('/'); // 路由導航
    return true;
  } catch (error) {
    return false;
  }
};

// 3. Store 執行認證邏輯
const login = async (username, password) => {
  const response = await authAPI.login(username, password);
  localStorage.setItem('access_token', response.access_token);
  const user = await authAPI.getUserProfile();
  set({ isAuthenticated: true, user, authType: 'local' });
};

// 4. API 處理網路請求
const login = async (username, password) => {
  const response = await api.post('/login', { username, password });
  return response.data;
};
```

## 設計優勢

### 1. 關注點分離
- API Layer：只關心資料
- Store Layer：只關心狀態和業務邏輯
- Hook Layer：只關心 UI 需求

### 2. 可測試性
每一層都可以獨立測試

### 3. 可維護性
- API 變更：只需修改 API 層
- 業務邏輯變更：只需修改 Store 層
- UI 需求變更：只需修改 Hook 層

### 4. 可擴展性
可以輕鬆添加新的功能和 Hook

## 總結

| 層級 | 主要職責 | 關注點 | 返回值 |
|------|----------|--------|---------|
| API | 網路請求 | 資料獲取 | 純資料 |
| Store | 狀態管理 | 業務邏輯 | 狀態變更 |
| Hook | UI 邏輯 | 用戶體驗 | UI 友好介面 |

這種架構確保了單一職責、低耦合、高內聚、易測試、易維護的特性。 