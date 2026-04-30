import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { keycloakConfig } from '../config/keycloak.config';

// 為 window 物件添加 Keycloak 實例的類型聲明
declare global {
  interface Window {
    __keycloak_instance?: any;
  }
}

// 創建 axios 實例
const api = axios.create({
  baseURL: import.meta.env.VITE_APP_URL ,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 創建一個不經過攔截器的 axios 實例，專門用於 refresh
const refreshApi = axios.create({
  baseURL: import.meta.env.VITE_APP_URL ,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 從 localStorage 獲取 token
const getAccessToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');

// 設置 token 到 localStorage
export const setTokens = (accessToken: string, refreshToken: string) => {
  console.log('設置 tokens:', { accessToken: accessToken ? 'exists' : 'null', refreshToken: refreshToken ? 'exists' : 'null' });
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

// 清除 token
export const clearTokens = () => {
  console.log('清除所有 tokens');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// 動態獲取 Keycloak 實例（避免循環引用）
const getKeycloakInstance = () => {
  // 延遲載入 useKeycloak hook
  return window.__keycloak_instance;
};

// 刷新 SSO token 的輔助函數
const refreshSSOTokenIfNeeded = async () => {
  const keycloak = getKeycloakInstance();
  if (!keycloak) {
    console.warn('Keycloak 實例不可用');
    return false;
  }
  
  try {
    const refreshed = await keycloak.updateToken(30);
    if (refreshed) {
      console.log('SSO token 已刷新');
      // 更新 localStorage 中的 SSO tokens
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

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // 如果是 401 錯誤且不是重試請求
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log('收到 401 錯誤，嘗試刷新 token');
      
      try {
        // 檢查是否是 SSO 登入
        const ssoIdToken = localStorage.getItem('sso_idtoken');
        const ssoAccessToken = localStorage.getItem('sso_accesstoken');
        
        console.log('檢查 SSO 狀態:', { 
          hasSsoIdToken: !!ssoIdToken, 
          hasSsoAccessToken: !!ssoAccessToken 
        });
        
        if (ssoIdToken && ssoAccessToken) {
          console.log('SSO 登入 - 嘗試刷新 SSO token 並重新獲取應用 token');
          
          // 先嘗試刷新 SSO token
          const ssoRefreshed = await refreshSSOTokenIfNeeded();
          
          if (ssoRefreshed) {
            console.log('SSO token 刷新成功，重新獲取應用 token');
          } else {
            console.log('SSO token 無需刷新或刷新失敗，嘗試用現有 SSO token 獲取應用 token');
          }
          
          // 嘗試重新獲取應用 token
          const response = await authAPI.ssoLogin();
          console.log('SSO 登入響應:', response);
          
          const { access_token: accessToken, refresh_token: refreshToken } = response;
          
          if (!accessToken || !refreshToken) {
            console.error('SSO 登入響應缺少必要的 tokens:', { accessToken, refreshToken });
            throw new Error('SSO 登入響應缺少必要的 tokens');
          }
          
          // 更新 localStorage 中的 token
          setTokens(accessToken, refreshToken);
          
          // 更新請求頭並重試
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${accessToken}`,
          };
          
          return api(originalRequest);
        } else {
          console.log('本地登入 - 使用 refresh token');
          // 本地登入的情況，使用統一的 refresh 函數
          const refreshResult = await authAPI.refresh();
          
          if (!refreshResult || !refreshResult.access_token || !refreshResult.refresh_token) {
            console.error('Refresh token 失敗或響應無效');
            throw new Error('Refresh token failed');
          }
          
          console.log('本地登入 - refresh token 成功');
          
          // 更新請求頭並重試
          originalRequest.headers = {
            ...originalRequest.headers,
            Authorization: `Bearer ${refreshResult.access_token}`,
          };
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token 刷新失敗:', refreshError);
        // 刷新失敗，清除 token
        clearTokens();
        // 只有在非 SSO 登入的情況下才重定向到登入頁
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
  }
);

// API 方法
export const authAPI = {
  // 本地登入
  login: async (username: string, password: string) => {
    const response = await api.post('/login', { useraccount:username, password });
    return response.data;
  },

  // SSO 登入
  ssoLogin: async () => {
    // 從 localStorage 獲取 SSO tokens
    const sso_idtoken = localStorage.getItem('sso_idtoken');
    const sso_accesstoken = localStorage.getItem('sso_accesstoken');
    const sso_refreshtoken = localStorage.getItem('sso_refreshtoken');

    if (!sso_idtoken || !sso_accesstoken || !sso_refreshtoken) {
      throw new Error('SSO tokens not found');
    }

    console.log('使用 SSO tokens 獲取應用 tokens...');
    
    // 使用 SSO tokens 獲取應用 tokens
    const response = await api.get('/sso_token', {
      headers: {
        'sso_url': keycloakConfig.url,
        'sso_idtoken': sso_idtoken,
        'sso_accesstoken': sso_accesstoken,
        'sso_refreshtoken': sso_refreshtoken
      }
    });
    return response.data;
  },

  // 獲取應用程式 tokens
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
      // 使用不經過攔截器的 refreshApi 避免循環調用
      const response = await refreshApi.post('/auth/refresh', { refreshToken });
      console.log('authAPI.refresh: 收到響應:', response.data);
      
      const { access_token, refresh_token, user } = response.data;
      
      if (!access_token || !refresh_token) {
        console.error('authAPI.refresh: 響應缺少必要的 tokens:', { access_token, refresh_token });
        throw new Error('Refresh 響應缺少必要的 tokens');
      }
      
      // 更新 localStorage 中的 token
      setTokens(access_token, refresh_token);
      
      console.log('authAPI.refresh: 成功更新 tokens');
      // 返回底線格式的欄位名稱，與 localStorage key 一致
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

// 出勤相關 API
export const attendanceAPI = {
  getSiteCheckReport: async (date: string, auid?: number) => {
    try {
      const params: any = { utcdate: date };
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
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },
  
  // 新增批次打卡/取消打卡 API
  batchSetCheck: async (useraccounts: string[], date: string, status: 'checkin' | 'pending') => {
    try {
      console.log('發送請求到 /setcheck，參數:', { useraccounts, date, status });
      const response = await api.post('/setcheck', {
        useraccounts,
        date,
        status
      });
      console.log('API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('批次設置打卡狀態失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // 新增請假申請 API
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
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // 新增獲取請假資料 API
  getLeaveRecords: async (startDate: string, endDate: string) => {
    try {
      console.log('發送請求到 /getLeaveRecords，參數:', { startDate, endDate });
      const response = await api.post('/getLeaveRecords', {
        startdate:startDate,
        enddate:endDate
      });
      console.log('獲取請假資料 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('獲取請假資料失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // 新增取消請假 API
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
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // 新增獲取站點出勤統計資料 API
  getSiteCheckData: async (params: {
    site: string;
    startDate: string;
    endDate: string;
  }) => {
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
          headers: error.response?.headers
        });
      }
      throw error;
    }
  }
};

// 新增：獲取同單位同事 API
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

// 新增：獲取用戶群組配置 API
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

// 加班相關 API
export const overtimeAPI = {
  // 獲取加班記錄
  getOvertimeRecords: async (startDate: string, endDate: string) => {
    try {
      console.log('發送請求到 /getovertime，參數:', { startDate, endDate });
      const response = await api.post('/getovertime', {
        startdate: startDate,
        enddate: endDate
      });
      console.log('獲取加班記錄 API 響應:', response);
      return response.data;
    } catch (error) {
      console.error('獲取加班記錄失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // 提交加班申請
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
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // 取消加班
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
          headers: error.response?.headers
        });
      }
      throw error;
    }
  }
};

// 用戶管理相關 API
export const userAPI = {
  // 獲取所有用戶資料
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
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // 更新用戶資料
  updateUser: async (useraccount: string, userData: {
    username?: string;
    tel?: string;
    location?: string;
    systems?: Array<{
      systemName: string;
      roles: string[];
    }>;
  }) => {
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
          headers: error.response?.headers
        });
      }
      throw error;
    }
  },

  // 刪除用戶
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
          headers: error.response?.headers
        });
      }
      throw error;
    }
  }
};

export interface HWMADashboardKPI {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon?: string;
  color?: 'blue' | 'yellow' | 'green' | 'purple';
}

/** HWMA 報修案例列表必填時區（須與後端約定字串完全一致） */
export const HWMA_X_TIME_ZONE = 'Asia/Taipei';

export interface HWMACaseItem {
  hrt_id: number;
  issued_no: string;
  issued_site: string;
  issued_site_phase: string;
  reporter_employee_id: string;
  reporter_nt_account: string;
  reporter_phone: string;
  reporter_organization_code: string;
  issue_description: string;
  service_type: string;
  device_name: string;
  device_brand: string;
  device_model: string;
  device_sn: string;
  device_owner: string;
  device_type: string;
  borrow_device_name: string | null;
  current_processor_role_code: string;
  created_by_nt_account: string;
  case_created_at: string;
  parent_case_status: string | null;
  total_sub_tickets: number;
}

export interface HWMACaseListResponse {
  total_count: number;
  items: HWMACaseItem[];
}

export interface HWMACaseListParams {
  /** 多值請用逗號連接，例如 `Progress,null`；其中 `null` 為字面字串，代表 parent_case_status 為 null */
  issued_status?: string;
  start_datetime?: string;
  end_datetime?: string;
  page?: number;
  page_size?: number;
}

export type HWMACaseServiceType = 'PC' | 'Parts' | 'Monitor';
export type HWMACaseDeviceType = 'SNB' | 'SPC';

/** POST /HWMA/case 請求 body（勿送 hrt_id、case_created_at 等由後端產生之欄位） */
export interface HWMACaseCreateBody {
  service_type: HWMACaseServiceType;
  device_type: HWMACaseDeviceType;
  issued_no?: string;
  issued_site?: string;
  issued_site_phase?: string;
  reporter_employee_id?: string;
  reporter_nt_account?: string;
  reporter_phone?: string;
  reporter_organization_code?: string;
  issue_description?: string;
  device_name?: string;
  device_brand?: string;
  device_model?: string;
  device_sn?: string;
  device_owner?: string;
  borrow_device_name?: string;
  created_by_nt_account?: string;
}

/** GET /:caseid/case-center_data 回傳 */
export interface HWMACaseCenterPrefillResponse {
  device_info: {
    device_name: string;
    device_brand: string;
    device_model: string;
    device_sn: string;
    device_owner: string;
    device_type: HWMACaseDeviceType;
  };
  issue_description: string;
  issued_no: string;
  issued_site: string;
  issued_site_phase: string;
  reporter_employee_id: string;
  reporter_nt_account: string;
  reporter_phone: string;
  reporter_organization_code: string;
  reporter_name?: string;
}

/** GET /itcms/:device_name/device-info 回傳 */
export interface HWMAItcmsDeviceInfoResponse {
  device_name: string;
  device_brand: string;
  device_model: string;
  device_sn: string;
  device_owner: string;
  device_type: HWMACaseDeviceType;
  device_warranty_date: string;
}

/** GET /HWMA/repaired 每筆子單內嵌之母單快照（鍵名與 hwmacase 對齊；時間為 created_at / updated_at） */
export interface HWMARepairParentTicket {
  hrt_id: number;
  issued_no: string;
  issued_site: string | null;
  issued_site_phase: string | null;
  reporter_employee_id: string | null;
  reporter_nt_account: string | null;
  reporter_phone: string | null;
  reporter_organization_code: string | null;
  issue_description: string | null;
  service_type: HWMACaseServiceType;
  device_name: string | null;
  device_brand: string | null;
  device_model: string | null;
  device_sn: string | null;
  device_owner: string | null;
  device_type: HWMACaseDeviceType;
  borrow_device_name: string | null;
  current_processor_role_code: string | null;
  created_by_nt_account: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface HWMARepairFlowCurrentState {
  state_code: string;
  name: string;
  entered_at: string;
  state_type: string;
  is_visible: boolean;
  is_special: boolean;
  sla_limit_seconds: number;
  custom_message: null | Record<string, unknown>;
}

export interface HWMARepairAvailableAction {
  action_code: string;
  action_name: string;
  to_state_code: string;
  is_default: boolean;
  condition_code: string | null;
  /** 為 true 時於 RepairFlow 頁首右上角顯示 */
  is_special?: boolean;
}

export interface HWMARepairHistoryEntry {
  from_state_code: string;
  to_state_code: string;
  action_code: string;
  action_name: string;
  action_by: string;
  entered_at: string;
  left_at: string | null;
  duration_seconds: number | null;
  transaction_id: string;
}

export interface HWMARepairDefaultFuturePath {
  ws_id: string;
  state_code: string;
  state_name: string;
  state_type: string;
  is_start: boolean;
  is_final: boolean;
  is_special: boolean;
  is_visible: boolean;
  is_current: boolean;
  default_transition_action_code: string | null;
  default_transition_action_name: string | null;
  default_transition_to_ws_id: string | null;
  /** 若後端提供，則於流程節點旁顯示處理時間上限 */
  sla_limit_seconds?: number | null;
}

export interface HWMARepairEventLogEntry {
  event_code: string;
  event_name: string;
  event_by: string;
  event_at: string;
}

export interface HWMARepairFlowStatus {
  instance_id: string;
  business_id: string;
  flow_code: string;
  current_state: HWMARepairFlowCurrentState;
  available_actions: HWMARepairAvailableAction[];
  history: HWMARepairHistoryEntry[];
  default_future_paths: HWMARepairDefaultFuturePath[];
  event_log: HWMARepairEventLogEntry[];
}

/** GET /HWMA/repaired 單筆子單（基本資訊 + 母單快照 + 流程引擎） */
export interface HWMARepairItem {
  detail_ticket_no: string;
  detail_issued_remark: string | null;
  detail_issued_context: unknown | null;
  current_status: string;
  current_process_nt: string;
  current_process_name: string;
  current_process_tel: string;
  hrd_id: number;
  hrt_id: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  parent_ticket: HWMARepairParentTicket;
  flow_status: HWMARepairFlowStatus;
}

/** GET /HWMA/repaired 成功 200 */
export interface HWMARepairByCaseResponse {
  total_count: number;
  items: HWMARepairItem[];
}

export type HWMADeviceWarrantyHint = 'IN_WARRANTY' | 'OUT_WARRANTY';

export interface HWMAPricebookRow {
  pricebook_id: number | string;
  item_category: string;
  item_name: string;
  item_spec: string;
  device_model: string;
  unit_price: number;
  currency: string;
}

export interface HWMAPricebookResponse {
  items: HWMAPricebookRow[];
  device_warranty_hint: HWMADeviceWarrantyHint;
}

export interface HWMARepairItemOption {
  item_category: string;
  item_name: string;
  item_spec: string;
  device_model: string;
  unit_price?: number | null;
  currency?: string | null;
}

export type HWMARepairItemsByCaseResponse = HWMARepairItemOption[];

export type HWMAWarrantyTypeValue = 'IN_WARRANTY' | 'OUT_WARRANTY' | 'ONE_PRICE';

export interface HWMAWarrantyTypeOption {
  value: HWMAWarrantyTypeValue;
  label: string;
}

/** PATCH /HWMA/transition/:repairId 請求 body */
export interface HWMATransitionRequestBody {
  action_code: string;
  context: Record<string, unknown>;
}

/** VENDOR_ISSUE_SUBMIT 之 repair_items 單筆 */
export interface HWMAVendorTransitionRepairItem {
  item_category: string;
  item_name: string;
  item_spec: string;
  device_model: string;
  count: number;
  remark?: string;
  warranty_type?: HWMAWarrantyTypeValue;
}

// 硬體維護 API
export const hardwareMaintenanceAPI = {
  /** GET /HWMA/repaired?issued_no= — 子單管理（每筆含 parent_ticket、flow_status） */
  getRepairedByIssuedNo: async (issued_no: string) => {
    try {
      const response = await api.get<HWMARepairByCaseResponse>('/HWMA/repaired', {
        params: { issued_no },
        headers: {
          'X-Time-Zone': HWMA_X_TIME_ZONE,
        },
      });
      return response.data;
    } catch (error) {
      console.error('取得 HWMA 維修子單管理資料失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** POST /cases/:caseid/repqire/ — 以母單編號建立子單 */
  createRepairByCaseId: async (caseid: string) => {
    try {
      const encoded = encodeURIComponent(caseid);
      const response = await api.post(
        `/cases/${encoded}/repqire/`,
        {},
        {
          headers: {
            'X-Time-Zone': HWMA_X_TIME_ZONE,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('建立子單失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** GET /HWMA/repaired/{rid} — 單筆子單（rid 為 detail_ticket_no，須 URL 編碼） */
  getRepairedByRid: async (rid: string) => {
    try {
      const encoded = encodeURIComponent(rid);
      const response = await api.get<HWMARepairItem>(`/HWMA/repaired/${encoded}`, {
        headers: {
          'X-Time-Zone': HWMA_X_TIME_ZONE,
        },
      });
      return response.data;
    } catch (error) {
      console.error('取得 HWMA 單筆維修子單失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** GET /HWMA/pricebook — 價目與保固提示（hrt_id 可選） */
  getPricebook: async (hrt_id?: number) => {
    try {
      const response = await api.get<HWMAPricebookResponse>('/HWMA/pricebook', {
        params:
          hrt_id != null && Number.isFinite(hrt_id) ? { hrt_id } : undefined,
        headers: {
          'X-Time-Zone': HWMA_X_TIME_ZONE,
        },
      });
      return response.data;
    } catch (error) {
      console.error('取得 HWMA 價目失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** GET /cases/:case_id/reqpir-items — 以 issued_no 或 hrt_id 取得可維修品項 */
  getRepairItemsByCase: async (case_id: string | number) => {
    try {
      const encoded = encodeURIComponent(String(case_id));
      const response = await api.get<HWMARepairItemsByCaseResponse | { items?: HWMARepairItemOption[] }>(
        `/cases/${encoded}/reqpir-items`,
        {
          headers: {
            'X-Time-Zone': HWMA_X_TIME_ZONE,
          },
        },
      );
      if (Array.isArray(response.data)) return response.data;
      return Array.isArray(response.data?.items) ? response.data.items : [];
    } catch (error) {
      console.error('取得可維修品項失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** GET /cases/:case_id/warranty_type — 依 case 取得可選保固類型（純陣列） */
  getWarrantyTypeOptionsByCase: async (case_id: string | number) => {
    try {
      const encoded = encodeURIComponent(String(case_id));
      const response = await api.get<HWMAWarrantyTypeOption[]>(
        `/cases/${encoded}/warranty_type`,
        {
          headers: {
            'X-Time-Zone': HWMA_X_TIME_ZONE,
          },
        },
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('取得保固類型選項失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * PATCH /HWMA/transition/{repairId} — 子單流程轉移（repairId 為 detail_ticket_no，須 URL 編碼）
   * 200 回傳與 GET /HWMA/repaired/:rid 相同之一筆 HWMARepairItem
   */
  patchTransition: async (repairId: string, body: HWMATransitionRequestBody) => {
    try {
      const encoded = encodeURIComponent(repairId);
      const response = await api.patch<HWMARepairItem>(
        `/HWMA/transition/${encoded}`,
        body,
        {
          headers: {
            'X-Time-Zone': HWMA_X_TIME_ZONE,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('HWMA 流程轉移失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** GET /:caseid/case-center_data — 以 issued_no 取得報案系統預填資料 */
  getCaseCenterPrefill: async (caseid: string) => {
    try {
      const encoded = encodeURIComponent(caseid);
      const response = await api.get<HWMACaseCenterPrefillResponse>(
        `/${encoded}/case-center_data`,
        {
          headers: {
            'X-Time-Zone': HWMA_X_TIME_ZONE,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('取得 Case Center 預填資料失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** GET /itcms/:device_name/device-info — 以 device_name 取得 ITCMS 設備資料 */
  getItcmsDeviceInfo: async (device_name: string) => {
    try {
      const encoded = encodeURIComponent(device_name);
      const response = await api.get<HWMAItcmsDeviceInfoResponse>(
        `/itcms/${encoded}/device-info`,
        {
          headers: {
            'X-Time-Zone': HWMA_X_TIME_ZONE,
          },
        },
      );
      return response.data;
    } catch (error) {
      console.error('取得 ITCMS 設備資料失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** POST /HWMA/case — 新建報修案例（201 回傳完整 CaseItem） */
  createCase: async (body: HWMACaseCreateBody) => {
    try {
      const response = await api.post<HWMACaseItem>('/HWMA/case', body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Time-Zone': HWMA_X_TIME_ZONE,
        },
      });
      return response.data;
    } catch (error) {
      console.error('建立 HWMA 報修案例失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** GET /HWMA/case — 報修案例列表（含 X-Time-Zone header） */
  getCaseList: async (params: HWMACaseListParams) => {
    try {
      const response = await api.get<HWMACaseListResponse>('/HWMA/case', {
        params,
        headers: {
          'X-Time-Zone': HWMA_X_TIME_ZONE,
        },
      });
      return response.data;
    } catch (error) {
      console.error('取得 HWMA 報修案例列表失敗:', error);
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

export default api; 