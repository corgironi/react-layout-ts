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
  leaves: Leave[];
  loading: boolean;
  error: string | null;
  fetchLeaves: () => Promise<void>;
  createLeave: (leave: Omit<Leave, 'id'>) => Promise<void>;
  updateLeave: (id: string, leave: Partial<Leave>) => Promise<void>;
  deleteLeave: (id: string) => Promise<void>;
}

// 請假記錄狀態管理
export const useLeaveStore = create<LeaveState>((set) => ({
  leaves: [],
  loading: false,
  error: null,

  // 獲取請假記錄
  fetchLeaves: async () => {
    set({ loading: true, error: null });
    try {
      const response = await leaveAPI.getLeaves();
      set({ leaves: response, loading: false });
    } catch (error) {
      set({ error: '獲取請假記錄失敗', loading: false });
    }
  },

  // 創建請假記錄
  createLeave: async (leave) => {
    set({ loading: true, error: null });
    try {
      const response = await leaveAPI.createLeave(leave);
      set((state) => ({
        leaves: [...state.leaves, response],
        loading: false
      }));
    } catch (error) {
      set({ error: '創建請假記錄失敗', loading: false });
    }
  },

  // 更新請假記錄
  updateLeave: async (id, leave) => {
    set({ loading: true, error: null });
    try {
      const response = await leaveAPI.updateLeave(id, leave);
      set((state) => ({
        leaves: state.leaves.map((l) => (l.id === id ? response : l)),
        loading: false
      }));
    } catch (error) {
      set({ error: '更新請假記錄失敗', loading: false });
    }
  },

  // 刪除請假記錄
  deleteLeave: async (id) => {
    set({ loading: true, error: null });
    try {
      await leaveAPI.deleteLeave(id);
      set((state) => ({
        leaves: state.leaves.filter((l) => l.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: '刪除請假記錄失敗', loading: false });
    }
  }
})); 