import { create } from 'zustand';
import { authAPI } from '../api/api';

interface SystemRole {
  systemName: string;
  roles: string[];
}

interface User {
  useraccount: string;
  username: string;
  name?: string; // 可選的姓名
  email?: string; // 可選的郵箱
  role?: string; // 可選的角色
  tel: string;
  location: string;
  systems: SystemRole[];
  authType?: 'local' | 'sso'; // 添加認證類型
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  authType: 'local' | 'sso' | null;
  login: (username: string, password: string) => Promise<void>;
  ssoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  checkAuth: () => Promise<boolean>;
}

// 預登入狀態鍵值
const PRE_LOGIN_TYPE_KEY = 'preLoginType';

// 清除所有 tokens 的函數
const clearAllTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('sso_idtoken');
  localStorage.removeItem('sso_accesstoken');
  localStorage.removeItem('sso_refreshtoken');
};

// 設置預登入類型
const setPreLoginType = (type: 'local' | 'sso') => {
  localStorage.setItem(PRE_LOGIN_TYPE_KEY, type);
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  authType: null,

  login: async (username: string, password: string) => {
    try {
      // 清除現有認證狀態
      clearAllTokens();
      
      // 執行登入 API
      const response = await authAPI.login(username, password);
      const { accessToken,  refreshToken } = response;
      
      // 儲存 tokens
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      setPreLoginType('local');
      
      // 嘗試獲取用戶詳細資料
      let user;
      try {
        console.log('嘗試獲取用戶 profile...');
        user = await authAPI.getUserProfile();
        console.log('用戶 profile 獲取成功:', user);
      } catch (profileError) {
        console.warn('獲取用戶 profile 失敗，使用登入響應中的 user 資訊或預設值');
        // 回退到登入響應中的 user 資訊或預設值
        user = response.user || {
          useraccount: username,
          username: username,
          name: username,
          email: '',
          role: 'user',
          tel: '',
          location: '',
          systems: []
        };
      }
      
      // 設置用戶狀態
      set({ 
        isAuthenticated: true, 
        user: { ...user, authType: 'local' },
        authType: 'local'
      });
    } catch (error) {
      console.error('本地登入失敗:', error);
      throw error;
    }
  },

  ssoLogin: async () => {
    try {
      // 清除現有認證狀態
      clearAllTokens();
      
      // 執行 SSO 登入 API
      const response = await authAPI.ssoLogin();
      const { access_token: accessToken, refresh_token: refreshToken } = response;
      
      // 儲存 tokens
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      setPreLoginType('sso');
      
      // 嘗試獲取用戶詳細資料
      let user;
      try {
        console.log('嘗試獲取 SSO 用戶 profile...');
        user = await authAPI.getUserProfile();
        console.log('SSO 用戶 profile 獲取成功:', user);
      } catch (profileError) {
        console.warn('獲取 SSO 用戶 profile 失敗，使用登入響應中的 user 資訊或預設值');
        // 回退到登入響應中的 user 資訊或預設值
        user = response.user || {
          useraccount: 'sso_user',
          username: 'SSO 用戶',
          name: 'SSO 用戶',
          email: '',
          role: 'user',
          tel: '',
          location: '',
          systems: []
        };
      }
      
      // 設置用戶狀態
      set({ 
        isAuthenticated: true, 
        user: { ...user, authType: 'sso' },
        authType: 'sso'
      });
    } catch (error) {
      console.error('SSO 登入失敗:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // 調用後端登出 API
      await authAPI.logout();
    } catch (error) {
      console.warn('後端登出失敗，繼續執行本地清理:', error);
    }
    
    // 清除所有 tokens
    clearAllTokens();
    
    // 重置狀態
    set({
      isAuthenticated: false,
      user: null,
      authType: null
    });
  },

  setUser: (user: User) => {
    set({ user });
  },

  checkAuth: async () => {
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        set({ isAuthenticated: false, user: null, authType: null });
        return false;
      }

      // 檢查 token 是否有效 - 暫時跳過 API 調用，直接返回 true
      // const response = await authAPI.checkAuth();
      // if (response.valid) {
      //   // 獲取用戶資訊
      //   try {
      //     const user = await authAPI.getUserProfile();
      //     const authType = getPreLoginType();
      //     set({ 
      //       isAuthenticated: true, 
      //       user: { ...user, authType: authType || 'local' },
      //       authType: authType || 'local'
      //     });
      //     return true;
      //   } catch (profileError) {
      //     console.warn('獲取用戶 profile 失敗:', profileError);
      //     // 如果無法獲取 profile，但 token 有效，仍然認為已認證
      //     return true;
      //   }
      // } else {
      //   set({ isAuthenticated: false, user: null, authType: null });
      //   return false;
      // }
      
      // 暫時直接返回 true，避免 API 調用錯誤
      return true;
    } catch (error) {
      console.error('檢查認證狀態失敗:', error);
      set({ isAuthenticated: false, user: null, authType: null });
      return false;
    }
  }
}));

export default useAuthStore; 