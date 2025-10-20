// @ts-nocheck
import { create } from 'zustand';
import { useLeaveStore } from './leaveStore';
import { attendanceAPI } from '../api/api';

export interface Engineer {
  account: string;
  name: string;
  eid: string;
  site: '新竹' | '台中' | '高雄';
  department: string;
}

export interface AttendanceRecord {
  date: string;
  time: string;
  account: string;
  name: string;
  eid: string;
  status: 'Checked-in' | 'Pending' | 'Leave';
  site: '新竹' | '台中' | '高雄';
  proxy?: string | null;
}

// API 返回的數據類型
export interface SiteCheckReportItem {
  useraccount: string;
  status: string;
  site: string;
  telephone: string;
  updatedate: string;
  checktime: string | null;
  delegate: string | null;
}

interface AttendanceState {
  engineers: Engineer[];
  attendanceRecords: AttendanceRecord[];
  siteCheckReports: SiteCheckReportItem[];
  isLoading: boolean;
  error: string | null;
  fetchAttendanceData: (date?: string) => void;
  updateStatus: (eid: string, status: 'Checked-in' | 'Pending' | 'Leave') => void;
  batchCheckIn: (eids: string[]) => void;
  batchCancelCheckIn: (eids: string[]) => void;
  fetchSiteCheckReport: (date: string, auid?: number) => Promise<void>;
  records: AttendanceRecord[];
  loading: boolean;
  fetchRecords: (startDate: string, endDate: string) => Promise<void>;
  createRecord: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>;
  updateRecord: (id: string, record: Partial<AttendanceRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
}

// 註釋掉模擬工程師資料
// const mockEngineers: Engineer[] = [
//   { account: 'john123', name: '張志明', eid: 'E001', site: '新竹', department: '軟體開發部' },
//   { account: 'mary456', name: '王小明', eid: 'E002', site: '新竹', department: '系統整合部' },
//   { account: 'peter789', name: '陳大文', eid: 'E003', site: '新竹', department: '測試部' },
//   { account: 'lisa111', name: '林美玲', eid: 'E004', site: '台中', department: '軟體開發部' },
//   { account: 'mike222', name: '吳建志', eid: 'E005', site: '台中', department: '系統整合部' },
//   { account: 'sarah333', name: '黃雅琪', eid: 'E006', site: '台中', department: '測試部' },
//   { account: 'david444', name: '劉俊宏', eid: 'E007', site: '高雄', department: '軟體開發部' },
//   { account: 'emma555', name: '張淑芬', eid: 'E008', site: '高雄', department: '系統整合部' },
//   { account: 'kevin666', name: '許志豪', eid: 'E009', site: '高雄', department: '測試部' },
//   { account: 'roni123', name: '高雅婷', eid: 'E010', site: '新竹', department: '軟體開發部' },
// ];

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  // 初始化為空數組，不再使用 mock 數據
  engineers: [],
  attendanceRecords: [],
  siteCheckReports: [],
  isLoading: false,
  error: null,
  
  fetchAttendanceData: (date) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const leaveRecords = useLeaveStore.getState().leaveRecords;
    
    // 使用 API 返回的數據創建出勤記錄，不再使用 mock 數據
    const siteReports = get().siteCheckReports;
    if (siteReports.length > 0) {
      const records = siteReports.map(report => {
        // 檢查是否有請假記錄
        const leaveRecord = leaveRecords.find(
          leave => leave.account === report.useraccount && leave.date === targetDate
        );
        
        // 將 API 狀態轉換為本地狀態
        let status: 'Checked-in' | 'Pending' | 'Leave' = 'Pending';
        if (report.status === 'checkin') {
          status = 'Checked-in';
        } else if (leaveRecord) {
          status = 'Leave';
        }
        
        return {
          date: targetDate,
          time: report.checktime || '',
          account: report.useraccount,
          name: report.useraccount, // 使用 useraccount 作為名稱
          eid: report.useraccount, // 使用 useraccount 作為員工編號
          status,
          site: report.site as any, // 類型轉換
          proxy: leaveRecord?.proxy || report.delegate
        };
      });
      
      set({ attendanceRecords: records });
    }
  },
  
  updateStatus: (eid, status) => {
    set(state => ({
      attendanceRecords: state.attendanceRecords.map(record => {
        if (record.eid === eid) {
          // 如果是簽到，添加時間
          const time = status === 'Checked-in' ? new Date().toLocaleTimeString() : '';
          return { ...record, status, time };
        }
        return record;
      })
    }));
  },
  
  batchCheckIn: async (eids) => {
    set({ isLoading: true, error: null });
    
    try {
      // 獲取當前選擇的日期
      const targetDate = get().attendanceRecords[0]?.date || new Date().toISOString().split('T')[0];
      
      // 將 eids 轉換為 useraccounts
      const useraccounts = eids;
      
      // 調用 API
      await attendanceAPI.batchSetCheck(useraccounts, targetDate, 'checkin');
      
      // 更新本地狀態
      const now = new Date().toLocaleTimeString();
      set(state => ({
        attendanceRecords: state.attendanceRecords.map(record => {
          if (eids.includes(record.eid) && record.status !== 'Leave') {
            return { ...record, status: 'Checked-in', time: now };
          }
          return record;
        }),
        isLoading: false
      }));
      
      // 重新獲取數據以確保顯示最新狀態
      get().fetchSiteCheckReport(targetDate);
    } catch (error) {
      console.error('批次打卡失敗:', error);
      set({ 
        error: error instanceof Error ? error.message : '批次打卡失敗', 
        isLoading: false 
      });
    }
  },
  
  batchCancelCheckIn: async (eids) => {
    set({ isLoading: true, error: null });
    
    try {
      // 獲取當前選擇的日期
      const targetDate = get().attendanceRecords[0]?.date || new Date().toISOString().split('T')[0];
      
      // 將 eids 轉換為 useraccounts
      const useraccounts = eids;
      
      // 調用 API
      await attendanceAPI.batchSetCheck(useraccounts, targetDate, 'pending');
      
      // 更新本地狀態
      set(state => ({
        attendanceRecords: state.attendanceRecords.map(record => {
          if (eids.includes(record.eid) && record.status !== 'Leave') {
            return { ...record, status: 'Pending', time: '' };
          }
          return record;
        }),
        isLoading: false
      }));
      
      // 重新獲取數據以確保顯示最新狀態
      get().fetchSiteCheckReport(targetDate);
    } catch (error) {
      console.error('批次取消打卡失敗:', error);
      set({ 
        error: error instanceof Error ? error.message : '批次取消打卡失敗', 
        isLoading: false 
      });
    }
  },
  
  // 獲取日報表的方法
  fetchSiteCheckReport: async (date, auid) => {
    set({ isLoading: true, error: null });
    
    try {
      // 如果有區域參數，則傳遞給 API
      let data;
      if (auid !== undefined) {
        data = await attendanceAPI.getSiteCheckReport(date, auid);
      } else {
        data = await attendanceAPI.getSiteCheckReport(date);
      }
      
      console.log('API 返回的原始數據:', data);
      
      // 確保數據是數組
      const reportData = Array.isArray(data) ? data : [];
      
      set({ siteCheckReports: reportData, isLoading: false });
      
      // 獲取數據後立即更新出勤記錄
      get().fetchAttendanceData(date);
    } catch (error) {
      console.error('Failed to fetch daily report:', error);
      set({ 
        error: error instanceof Error ? error.message : '獲取日報表失敗', 
        isLoading: false 
      });
    }
  },

  records: [],
  loading: false,

  // 獲取考勤記錄
  fetchRecords: async (startDate: string, endDate: string) => {
    set({ loading: true, error: null });
    try {
      const response = await attendanceAPI.getRecords(startDate, endDate);
      set({ records: response, loading: false });
    } catch (error) {
      set({ error: '獲取考勤記錄失敗', loading: false });
    }
  },

  // 創建考勤記錄
  createRecord: async (record) => {
    set({ loading: true, error: null });
    try {
      const response = await attendanceAPI.createRecord(record);
      set((state) => ({
        records: [...state.records, response],
        loading: false
      }));
    } catch (error) {
      set({ error: '創建考勤記錄失敗', loading: false });
    }
  },

  // 更新考勤記錄
  updateRecord: async (id, record) => {
    set({ loading: true, error: null });
    try {
      const response = await attendanceAPI.updateRecord(id, record);
      set((state) => ({
        records: state.records.map((r) => (r.id === id ? response : r)),
        loading: false
      }));
    } catch (error) {
      set({ error: '更新考勤記錄失敗', loading: false });
    }
  },

  // 刪除考勤記錄
  deleteRecord: async (id) => {
    set({ loading: true, error: null });
    try {
      await attendanceAPI.deleteRecord(id);
      set((state) => ({
        records: state.records.filter((r) => r.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: '刪除考勤記錄失敗', loading: false });
    }
  }
}));
