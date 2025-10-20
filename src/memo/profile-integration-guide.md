# 用戶 Profile 整合指南

## 概述

本指南說明如何在登入後自動獲取用戶 profile 資料，並將其存入 `useAuthStore` 中，讓其他組件（如 Header、HomePage）可以顯示詳細的用戶信息。

## 主要改進

### 1. useAuthStore 登入流程改進

#### 本地登入 (login)
```typescript
login: async (username: string, password: string) => {
  try {
    // 1. 清除現有認證狀態
    const { clearAllTokens } = get();
    clearAllTokens();
    
    // 2. 執行登入 API
    const response = await authAPI.login(username, password);
    const { access_token: accessToken, refresh_token: refreshToken } = response;
    
    // 3. 儲存 tokens
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setPreLoginType('local');
    
    // 4. 嘗試獲取用戶詳細資料
    let user;
    try {
      console.log('嘗試獲取用戶 profile...');
      user = await authAPI.getUserProfile();
      console.log('用戶 profile 獲取成功:', user);
    } catch (profileError) {
      console.warn('獲取用戶 profile 失敗，使用登入響應中的 user 資訊或預設值');
      // 回退到登入響應中的 user 資訊或預設值
      user = response.user || {
        id: '',
        username: username || '',
        name: username || '',
        email: '',
        role: 'user'
      };
    }
    
    // 5. 設置用戶狀態
    set({ 
      isAuthenticated: true, 
      user: { ...safeUser, authType: 'local' },
      authType: 'local'
    });
  } catch (error) {
    console.error('本地登入失敗:', error);
    throw error;
  }
}
```

#### SSO 登入 (ssoLogin)
- 使用相同的流程，但在獲取 profile 失敗時回退到 SSO 響應中的用戶資訊

### 2. Header 組件改進

#### 顯示詳細用戶信息
```typescript
// 用戶頭像 - 優先使用姓名，其次用戶名
{user?.name?.charAt(0) || user?.username?.charAt(0) || '用'}

// 用戶顯示名稱
{user?.name || user?.username || '用戶'}

// 用戶角色和登入方式
{user?.role || 'user'} | {user?.authType === 'sso' ? 'SSO' : '本地'}
```

#### 下拉菜單詳細信息
```typescript
<div className={styles.userDetail}>
  <div><strong>用戶名：</strong>{user?.username || 'N/A'}</div>
  <div><strong>姓名：</strong>{user?.name || 'N/A'}</div>
  <div><strong>信箱：</strong>{user?.email || 'N/A'}</div>
  <div><strong>角色：</strong>{user?.role || 'user'}</div>
  <div><strong>登入方式：</strong>{user?.authType === 'sso' ? 'SSO 登入' : '本地登入'}</div>
</div>
```

### 3. HomePage 組件改進

#### 個性化歡迎信息
```typescript
// 根據時間顯示問候語
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return '早安';
  if (hour < 18) return '午安';
  return '晚安';
};

// 個性化標題
<h1>
  {getGreeting()}，{user?.name || user?.username || '用戶'}！
  <span className={styles.welcomeSubtitle}>歡迎使用管理系統</span>
</h1>
```

#### 詳細用戶歡迎信息
```typescript
<div className={styles.userWelcome}>
  <p>
    您好，{user.name || user.username}
    {user.role && user.role !== 'user' && ` (${user.role})`}
    ，今天是 {new Date().toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })}
  </p>
  <small className={styles.loginType}>
    登入方式：{user.authType === 'sso' ? 'SSO 單一登入' : '本地帳號登入'}
  </small>
</div>
```

## 錯誤處理機制

### 1. Profile API 失敗處理
```typescript
// 3層回退機制
try {
  // 第一層：嘗試獲取 profile
  user = await authAPI.getUserProfile();
} catch (profileError) {
  // 第二層：使用登入響應中的 user 資訊
  user = response.user || {
    // 第三層：使用預設值
    id: '',
    username: username || '',
    name: username || '',
    email: '',
    role: 'user'
  };
}
```

### 2. 安全的用戶資訊處理
```typescript
// 最終安全檢查，確保不會因為 undefined 而出錯
const safeUser = user || {
  id: '',
  username: username || '',
  name: username || '',
  email: '',
  role: 'user'
};
```

## 樣式改進

### 1. Header 樣式
- 增加 `.userRole` 樣式顯示角色和登入方式
- 擴大 `.userDropdown` 寬度至 250px
- 新增 `.userDetail` 樣式顯示詳細信息
- 新增 `.divider` 分隔線樣式

### 2. HomePage 樣式
- 新增 `.welcome` 歡迎區域樣式
- 新增 `.welcomeSubtitle` 副標題樣式
- 新增 `.userWelcome` 用戶歡迎信息樣式
- 新增 `.loginType` 登入方式顯示樣式
- 改進 `.card` hover 效果

## 使用方式

### 1. 獲取用戶信息
```typescript
import useAuth from '../hooks/useAuth';

const { user } = useAuth();

// 安全地訪問用戶資訊
const displayName = user?.name || user?.username || '用戶';
const userRole = user?.role || 'user';
const authType = user?.authType === 'sso' ? 'SSO' : '本地';
```

### 2. 顯示用戶資訊
```typescript
// 用戶頭像
{user?.name?.charAt(0) || user?.username?.charAt(0) || '用'}

// 用戶名稱
{user?.name || user?.username || '用戶'}

// 角色信息
{user?.role && user.role !== 'user' && ` (${user.role})`}

// 登入方式
{user?.authType === 'sso' ? 'SSO 單一登入' : '本地帳號登入'}
```

## 優勢

### 1. 完整的用戶體驗
- ✅ 個性化歡迎信息
- ✅ 詳細的用戶資訊顯示
- ✅ 登入方式識別
- ✅ 角色信息展示

### 2. 健壯的錯誤處理
- ✅ 多層回退機制
- ✅ 安全的資料訪問
- ✅ 不會因為 API 失敗而影響登入流程

### 3. 響應式設計
- ✅ 適配不同屏幕尺寸
- ✅ 現代化的 UI 設計
- ✅ 一致的視覺風格

### 4. 開發者友好
- ✅ 清晰的日誌輸出
- ✅ 易於維護的代碼結構
- ✅ 完整的類型安全

## 測試建議

### 1. Profile API 測試
```typescript
// 測試 profile API 正常響應
test('should fetch user profile after login', async () => {
  // 模擬登入
  await login('testuser', 'password');
  
  // 驗證是否調用了 getUserProfile
  expect(authAPI.getUserProfile).toHaveBeenCalled();
  
  // 驗證用戶資訊是否正確設置
  expect(user.name).toBeDefined();
});

// 測試 profile API 失敗情況
test('should handle profile API failure gracefully', async () => {
  // 模擬 profile API 失敗
  jest.spyOn(authAPI, 'getUserProfile').mockRejectedValue(new Error('API Error'));
  
  // 執行登入
  await login('testuser', 'password');
  
  // 驗證仍然能正常登入
  expect(isAuthenticated).toBe(true);
  expect(user.username).toBe('testuser');
});
```

### 2. UI 組件測試
```typescript
// 測試 Header 用戶信息顯示
test('should display user info in header', () => {
  render(<Header />);
  
  expect(screen.getByText(user.name)).toBeInTheDocument();
  expect(screen.getByText(`${user.role} | ${authType}`)).toBeInTheDocument();
});

// 測試 HomePage 歡迎信息
test('should display personalized welcome message', () => {
  render(<HomePage />);
  
  expect(screen.getByText(`早安，${user.name}！`)).toBeInTheDocument();
  expect(screen.getByText(/登入方式/)).toBeInTheDocument();
});
```

## 相關檔案

- `src/store/useAuthStore.ts` - 認證狀態管理
- `src/api/api.ts` - API 請求處理
- `src/components/Header.tsx` - 頭部組件
- `src/pages/HomePage.tsx` - 首頁組件
- `src/hooks/useAuth.ts` - 認證 hook
- `src/components/Header.module.css` - Header 樣式
- `src/pages/HomePage.module.css` - HomePage 樣式

## 注意事項

1. **API 依賴**：確保後端提供 `/user/profile` API 端點
2. **錯誤處理**：Profile API 失敗不應影響正常登入流程
3. **性能考量**：Profile 資料會在登入時自動獲取，無需額外請求
4. **安全性**：所有用戶資訊訪問都使用安全的 optional chaining
5. **國際化**：日期和時間顯示使用繁體中文格式

這個整合方案提供了完整的用戶 profile 管理功能，讓應用程式能夠顯示豐富的用戶信息，同時保持良好的用戶體驗和健壯的錯誤處理。 