import './auth';
import axios from 'axios';
import { api } from './client';

export const attendanceAPI = {
  getSiteCheckReport: async (date: string, auid?: number) => {
    try {
      const params: Record<string, string | number> = { utcdate: date };
      if (auid !== undefined) {
        params.auid = auid;
      }

      console.log('發送請求到 /getdaily，參數:', params);
      const response = await api.post('/getdaily', params);
      console.log('API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('獲取日報表失敗:', error);
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

  batchSetCheck: async (useraccounts: string[], date: string, status: 'checkin' | 'pending') => {
    try {
      console.log('發送請求到 /setcheck，參數:', { useraccounts, date, status });
      const response = await api.post('/setcheck', {
        useraccounts,
        date,
        status,
      });
      console.log('API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('批次設置打卡狀態失敗:', error);
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

  submitLeaveRequest: async (leaveData: {
    account: string;
    startDateTime: string;
    endDateTime: string;
    proxyName: string;
    reason: string;
  }) => {
    try {
      console.log('發送請假申請到 /leave，參數:', leaveData);
      const response = await api.post('/applyleave', leaveData);
      console.log('請假申請 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('提交請假申請失敗:', error);
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

  getLeaveRecords: async (startDate: string, endDate: string) => {
    try {
      console.log('發送請求到 /getLeaveRecords，參數:', { startDate, endDate });
      const response = await api.post('/getLeaveRecords', {
        startdate: startDate,
        enddate: endDate,
      });
      console.log('獲取請假資料 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('獲取請假資料失敗:', error);
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

  cancelLeave: async (id: number) => {
    try {
      console.log('發送取消請假請求到 /cancelleave，參數:', { id });
      const response = await api.post('/cancelleave', { id });
      console.log('取消請假 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('取消請假失敗:', error);
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

  getSiteCheckData: async (params: { site: string; startDate: string; endDate: string }) => {
    try {
      console.log('發送請求到 /getsitecheckdata，參數:', params);
      const response = await api.post('/getsitecheckdata', params);
      console.log('獲取站點出勤統計資料 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('獲取站點出勤統計資料失敗:', error);
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

export const getSameEmployers = async () => {
  try {
    const response = await api.post('/getsameemployers');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || '獲取同事資訊失敗');
    }
    throw error;
  }
};

export const getUserGroup = async () => {
  try {
    const response = await api.get('/usergroup');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || '獲取用戶群組配置失敗');
    }
    throw error;
  }
};

export const overtimeAPI = {
  getOvertimeRecords: async (startDate: string, endDate: string) => {
    try {
      console.log('發送請求到 /getovertime，參數:', { startDate, endDate });
      const response = await api.post('/getovertime', {
        startdate: startDate,
        enddate: endDate,
      });
      console.log('獲取加班記錄 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('獲取加班記錄失敗:', error);
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

  setOvertime: async (overtimeData: {
    overtimeList: Array<{
      account: string;
      startDateTime: string;
      endDateTime: string;
      reason: string;
    }>;
    timezone: string;
  }) => {
    try {
      console.log('發送加班申請到 /setovertime，參數:', overtimeData);
      const response = await api.post('/setovertime', overtimeData);
      console.log('加班申請 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('提交加班申請失敗:', error);
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

  deleteOvertime: async (leaveId: number) => {
    try {
      console.log('發送取消加班請求到 /deleteovertime，參數:', { leave_id: leaveId });
      const response = await api.post('/deleteovertime', { leave_id: leaveId });
      console.log('取消加班 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('取消加班失敗:', error);
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
