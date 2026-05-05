import { AxiosError, AxiosRequestConfig } from 'axios';
import { keycloakConfig } from '../config/keycloak.config';
import { api, refreshApi, setTokens, clearTokens, getRefreshToken } from './client';

const getKeycloakInstance = () => window.__keycloak_instance;

const refreshSSOTokenIfNeeded = async () => {
  const keycloak = getKeycloakInstance() as {
    updateToken: (minValidity: number) => Promise<boolean>;
    idToken?: string;
    token?: string;
    refreshToken?: string;
  } | undefined;
  if (!keycloak) {
    console.warn('Keycloak 實例不可用');
    return false;
  }

  try {
    const refreshed = await keycloak.updateToken(30);
    if (refreshed) {
      console.log('SSO token 已刷新');
      localStorage.setItem('sso_idtoken', keycloak.idToken || '');
      localStorage.setItem('sso_accesstoken', keycloak.token || '');
      localStorage.setItem('sso_refreshtoken', keycloak.refreshToken || '');
      return true;
    }
    return false;
  } catch (error) {
    console.error('SSO token 刷新失敗:', error);
    return false;
  }
};

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/login', { useraccount: username, password });
    return response.data;
  },

  ssoLogin: async () => {
    const sso_idtoken = localStorage.getItem('sso_idtoken');
    const sso_accesstoken = localStorage.getItem('sso_accesstoken');
    const sso_refreshtoken = localStorage.getItem('sso_refreshtoken');

    if (!sso_idtoken || !sso_accesstoken || !sso_refreshtoken) {
      throw new Error('SSO tokens not found');
    }

    console.log('使用 SSO tokens 獲取應用 tokens...');

    const response = await api.get('/sso_token', {
      headers: {
        sso_url: keycloakConfig.url,
        sso_idtoken,
        sso_accesstoken,
        sso_refreshtoken,
      },
    });
    return response.data;
  },

  getAppTokens: async (headers: {
    sso_url: string;
    sso_idtoken: string;
    sso_accesstoken: string;
    sso_refreshtoken: string;
  }) => {
    const response = await api.get('/sso_token', { headers });
    return response.data;
  },

  refresh: async () => {
    const refreshToken = getRefreshToken();
    console.log('authAPI.refresh 被調用，refresh token:', refreshToken ? 'exists' : 'null');

    if (!refreshToken) {
      console.log('authAPI.refresh: 沒有 refresh token，返回 null');
      return null;
    }

    try {
      console.log('authAPI.refresh: 發送 refresh 請求');
      const response = await refreshApi.post('/auth/refresh', { refreshToken });
      console.log('authAPI.refresh: 收到響應:', response.data);

      const { access_token, refresh_token, user } = response.data;

      if (!access_token || !refresh_token) {
        console.error('authAPI.refresh: 響應缺少必要的 tokens:', { access_token, refresh_token });
        throw new Error('Refresh 響應缺少必要的 tokens');
      }

      setTokens(access_token, refresh_token);

      console.log('authAPI.refresh: 成功更新 tokens');
      return { access_token, refresh_token, user };
    } catch (error) {
      console.error('authAPI.refresh: 刷新失敗:', error);
      clearTokens();
      return null;
    }
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.error('登出 API 錯誤:', error);
      }
    }
    clearTokens();
  },

  getUserProfile: async () => {
    const response = await api.post('/user/profile');
    return response.data;
  },

  createUser: async (userData: {
    username: string;
    employeeId: string;
    name: string;
    site: string;
  }) => {
    const response = await api.post('/user/create', userData);
    return response.data;
  },
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('收到 401 錯誤，嘗試刷新 token');

      try {
        const ssoIdToken = localStorage.getItem('sso_idtoken');
        const ssoAccessToken = localStorage.getItem('sso_accesstoken');

        console.log('檢查 SSO 狀態:', {
          hasSsoIdToken: !!ssoIdToken,
          hasSsoAccessToken: !!ssoAccessToken,
        });

        if (ssoIdToken && ssoAccessToken) {
          console.log('SSO 登入 - 嘗試刷新 SSO token 並重新獲取應用 token');

          const ssoRefreshed = await refreshSSOTokenIfNeeded();

          if (ssoRefreshed) {
            console.log('SSO token 刷新成功，重新獲取應用 token');
          } else {
            console.log('SSO token 無需刷新或刷新失敗，嘗試用現有 SSO token 獲取應用 token');
          }

          const response = await authAPI.ssoLogin();
          console.log('SSO 登入響應:', response);

          const { access_token: accessToken, refresh_token: refreshToken } = response as {
            access_token: string;
            refresh_token: string;
          };

          if (!accessToken || !refreshToken) {
            console.error('SSO 登入響應缺少必要的 tokens:', { accessToken, refreshToken });
            throw new Error('SSO 登入響應缺少必要的 tokens');
          }

          setTokens(accessToken, refreshToken);

          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${accessToken}`,
          };

          return api(originalRequest);
        }

        console.log('本地登入 - 使用 refresh token');
        const refreshResult = await authAPI.refresh();

        if (!refreshResult || !refreshResult.access_token || !refreshResult.refresh_token) {
          console.error('Refresh token 失敗或響應無效');
          throw new Error('Refresh token failed');
        }

        console.log('本地登入 - refresh token 成功');

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${refreshResult.access_token}`,
        };

        return api(originalRequest);
      } catch (refreshError) {
        console.error('Token 刷新失敗:', refreshError);
        clearTokens();
        if (!localStorage.getItem('sso_idtoken')) {
          console.log('重定向到登入頁');
          window.location.href = '/login';
        } else {
          console.log('SSO 登入失敗，清除所有 SSO tokens 並重定向到登入頁');
          localStorage.removeItem('sso_idtoken');
          localStorage.removeItem('sso_accesstoken');
          localStorage.removeItem('sso_refreshtoken');
          localStorage.removeItem('preLoginType');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
