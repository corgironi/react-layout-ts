import './auth';
import axios from 'axios';
import { api } from './client';

export const userAPI = {
  getAllUsers: async () => {
    try {
      console.log('發送請求到 /users');
      const response = await api.get('/users');
      console.log('獲取所有用戶 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('獲取所有用戶資料失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      }
      throw error;
    }
  },

  updateUser: async (
    useraccount: string,
    userData: {
      username?: string;
      tel?: string;
      location?: string;
      systems?: Array<{
        systemName: string;
        roles: string[];
      }>;
    },
  ) => {
    try {
      console.log('發送更新用戶請求到 /users/' + useraccount, userData);
      const response = await api.patch(`/users/${useraccount}`, userData);
      console.log('更新用戶 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('更新用戶資料失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      }
      throw error;
    }
  },

  deleteUser: async (useraccount: string) => {
    try {
      console.log('發送刪除用戶請求到 /users/' + useraccount);
      const response = await api.delete(`/users/${useraccount}`);
      console.log('刪除用戶 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('刪除用戶失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      }
      throw error;
    }
  },
};
