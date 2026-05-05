import axios from 'axios';

declare global {
  interface Window {
    __keycloak_instance?: unknown;
  }
}

/** 主 axios 實例（含 Authorization 與 401 處理，由 auth 模組註冊 response 攔截器） */
export const api = axios.create({
  baseURL: import.meta.env.VITE_APP_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** 不經一般攔截器鏈的 refresh 專用實例 */
export const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_APP_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getAccessToken = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

export const setTokens = (accessToken: string, refreshToken: string) => {
  console.log('設置 tokens:', { accessToken: accessToken ? 'exists' : 'null', refreshToken: refreshToken ? 'exists' : 'null' });
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

export const clearTokens = () => {
  console.log('清除所有 tokens');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
