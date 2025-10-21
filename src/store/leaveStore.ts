// @ts-nocheck
import { create } from 'zustand';
import { getSameEmployers, attendanceAPI } from '../api/api';

// 類型定義
export interface Colleague {
  useraccount: string;
  username: string;
}

export interface LeaveRecord {
  id: number;
  account: string;
  startDateTime: string;
  endDateTime: string;
  proxyaccount: string | null;
  reason: string;
  accountName?: string;
  proxyName?: string | null;
}

export interface LeaveRequest {
  account: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
  proxy?: string;
}

// 請假記錄狀態管理
interface LeaveState {
  leaveRecords: Leave[];
  colleagues: Colleague[];
  isLoading: boolean;
  isLoadingColleagues: boolean;
  isSubmitting: boolean;
  error: string | null;
  fetchLeaveRecords: (startDate: string, endDate: string) => Promise<void>;
  fetchColleagues: () => Promise<void>;
  submitLeave: (leaveData: any) => Promise<void>;
  cancelLeave: (id: number) => Promise<void>;
}

// 請假記錄狀態管理
export const useLeaveStore = create<LeaveState>((set) => ({
  leaveRecords: [],
  colleagues: [],
  isLoading: false,
  isLoadingColleagues: false,
  isSubmitting: false,
  error: null,

  // 獲取請假記錄
  fetchLeaveRecords: async (startDate: string, endDate: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await attendanceAPI.getLeaveRecords(startDate, endDate);
      set({ leaveRecords: response || [], isLoading: false });
    } catch (error) {
      console.error('獲取請假記錄失敗:', error);
      set({ error: '獲取請假記錄失敗', isLoading: false });
    }
  },

  // 獲取同事資料
  fetchColleagues: async () => {
    set({ isLoadingColleagues: true, error: null });
    try {
      const response = await getSameEmployers();
      set({ colleagues: response || [], isLoadingColleagues: false });
    } catch (error) {
      console.error('獲取同事資料失敗:', error);
      set({ error: '獲取同事資料失敗', isLoadingColleagues: false });
    }
  },

  // 提交請假申請
  submitLeave: async (leaveData) => {
    set({ isSubmitting: true, error: null });
    try {
      await attendanceAPI.submitLeaveRequest(leaveData);
      set({ isSubmitting: false });
    } catch (error) {
      console.error('提交請假申請失敗:', error);
      set({ error: error instanceof Error ? error.message : '提交請假申請失敗', isSubmitting: false });
      throw error;
    }
  },

  // 取消請假
  cancelLeave: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await attendanceAPI.cancelLeave(id);
      set({ isLoading: false });
    } catch (error) {
      console.error('取消請假失敗:', error);
      set({ error: error instanceof Error ? error.message : '取消請假失敗', isLoading: false });
      throw error;
    }
  }
})); 