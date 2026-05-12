import './auth';
import axios from 'axios';
import { api } from './client';

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
  /** 裝置是否已在 IT service center（GET /HWMA/case 等回傳） */
  is_device_at_site?: boolean;
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

/** GET /cases/service/site — key／value 對照；value 可能為字串 "null"（如 All） */
export type HWMACaseServiceSiteMap = Record<string, string>;

/** GET /cases/service/type — 單筆條目 */
export interface HWMACaseServiceTypeBundleEntry {
  device_brand: string;
  device_model?: string;
}

/** GET /cases/service/type — 固定 pc / monitor / parts 三 key */
export interface HWMACaseServiceTypeBundleResponse {
  pc: HWMACaseServiceTypeBundleEntry[];
  monitor: HWMACaseServiceTypeBundleEntry[];
  parts: HWMACaseServiceTypeBundleEntry[];
}

/** POST /HWMA/case 請求 body（勿送 hrt_id、case_created_at 等由後端產生之欄位） */
export interface HWMACaseCreateBody {
  service_type: HWMACaseServiceType;
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
  /** 保固／保固到期等日期，建議 YYYY-MM-DD */
  warranty_date?: string;
  /**
   * 裝置是否已在 IT service center（true＝是；false＝否）。
   * 未送時後端視為 false；後端亦可能接受字串 "true"/"false" 等，此處以 boolean 送出。
   */
  is_device_at_site?: boolean;
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
  /** 裝置是否已在 IT service center */
  is_device_at_site?: boolean;
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
  /** 晚於 history 最後一段 left_at 之留言，或尚無 history 時之留言（當下 state 備註） */
  comments?: HWMAFlowCommentEntry[];
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

/**
 * 後端將 reqpircomment.json 依時間掛入 flow_status 之留言元素。
 * 讀取位置（RepairFlow 時間軸）：history[i].comments、current_state.comments、
 * default_future_paths[j].comments（is_current 與 current_state 對齊，UI 以 current_state 為主避免重複）。
 */
export interface HWMAFlowCommentEntry {
  comment: string;
  created_at: string;
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
  /** 落在本段 entered_at～left_at（含）之留言；可能為 [] */
  comments?: HWMAFlowCommentEntry[];
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
  /** is_current 時與 current_state.comments 一致；非目前節點通常為 [] */
  comments?: HWMAFlowCommentEntry[];
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

/**
 * GET /HWMA/case/:issued_no — 母單欄位 + **repairs**（每筆結構同 GET /HWMA/repaired/:rid）。
 * 留言由後端掛入各 repair.flow_status，請自 history / current_state / default_future_paths 讀取，勿另打 comment 專用 API。
 */
export interface HWMACaseWithRepairsResponse extends HWMACaseItem {
  repairs: HWMARepairItem[];
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

/** POST /cases/repairs/:detail_ticket_no/comment 成功 201 */
export interface HWMARepairCommentResponse {
  detail_ticket_no: string;
  comment: string;
  created_at: string;
}

/** POST /cases/reqpir/:detail_ticket_no/proxy 成功 200（路徑為 reqpir） */
export interface HWMARepairProxyResponse {
  detail_ticket_no: string;
  proxy: string;
  updated_at: string;
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

  /**
   * GET /HWMA/case/:issued_no — 單一母單 + 全部子單（含已掛入 flow_status 之留言）。
   * Path 參數為母單 issued_no（必要時 URL 編碼）；Header 須帶 X-Time-Zone。
   */
  getCaseWithRepairsByIssuedNo: async (issued_no: string) => {
    try {
      const encoded = encodeURIComponent(issued_no.trim());
      const response = await api.get<HWMACaseWithRepairsResponse>(`/HWMA/case/${encoded}`, {
        headers: {
          'X-Time-Zone': HWMA_X_TIME_ZONE,
        },
      });
      return response.data;
    } catch (error) {
      console.error('取得 HWMA 母單與子單失敗:', error);
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

  /** POST /cases/repairs/:detail_ticket_no/comment — 子單追加備註（不修改子單主檔） */
  postRepairComment: async (
    detail_ticket_no: string,
    body: { comment?: string; text?: string },
  ): Promise<HWMARepairCommentResponse> => {
    try {
      const encoded = encodeURIComponent(detail_ticket_no);
      const response = await api.post<HWMARepairCommentResponse>(
        `/cases/repairs/${encoded}/comment`,
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
      console.error('新增子單備註失敗:', error);
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
   * GET /cases/repairs/:detail_ticket_no/comment — 僅除錯／匯出用「純留言陣列」。
   * 一般畫面請自 GET /HWMA/repaired/:rid 或 GET /HWMA/case/:issued_no 之 flow_status 讀取 comments。
   */
  getRepairComments: async (detail_ticket_no: string): Promise<HWMAFlowCommentEntry[]> => {
    try {
      const encoded = encodeURIComponent(detail_ticket_no);
      const response = await api.get<HWMAFlowCommentEntry[]>(`/cases/repairs/${encoded}/comment`, {
        headers: {
          'X-Time-Zone': HWMA_X_TIME_ZONE,
        },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('取得子單留言列表失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** POST /cases/reqpir/:detail_ticket_no/proxy — 設定／覆寫設備代領人 */
  postRepairProxy: async (
    detail_ticket_no: string,
    body: { proxy?: string; proxy_name?: string },
  ): Promise<HWMARepairProxyResponse> => {
    try {
      const encoded = encodeURIComponent(detail_ticket_no);
      const response = await api.post<HWMARepairProxyResponse>(
        `/cases/reqpir/${encoded}/proxy`,
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
      console.error('設定代領人失敗:', error);
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

  /** GET /cases/service/site — 站點對照（JSON 物件，非陣列） */
  getCaseServiceSites: async (): Promise<HWMACaseServiceSiteMap> => {
    try {
      const response = await api.get<unknown>('/cases/service/site', {
        headers: {
          'X-Time-Zone': HWMA_X_TIME_ZONE,
        },
      });
      const data = response.data;
      if (data == null || typeof data !== 'object' || Array.isArray(data)) {
        return {};
      }
      const out: HWMACaseServiceSiteMap = {};
      for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        if (typeof v === 'string') {
          out[k] = v;
        } else if (typeof v === 'number' || typeof v === 'boolean') {
          out[k] = String(v);
        } else if (v === null) {
          out[k] = 'null';
        }
      }
      return out;
    } catch (error) {
      console.error('取得站點對照失敗:', error);
      if (axios.isAxiosError(error)) {
        console.error('請求錯誤詳情:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }
  },

  /** GET /cases/service/type — pc / monitor / parts 品牌與可選型號 */
  getCaseServiceTypeBundle: async (): Promise<HWMACaseServiceTypeBundleResponse> => {
    const normalizeEntry = (raw: unknown): HWMACaseServiceTypeBundleEntry | null => {
      if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
      const o = raw as Record<string, unknown>;
      const brand = o.device_brand;
      if (typeof brand !== 'string' || brand.trim() === '') return null;
      const entry: HWMACaseServiceTypeBundleEntry = { device_brand: brand.trim() };
      const model = o.device_model;
      if (typeof model === 'string' && model.trim() !== '') {
        entry.device_model = model.trim();
      }
      return entry;
    };
    const normalizeList = (list: unknown): HWMACaseServiceTypeBundleEntry[] => {
      if (!Array.isArray(list)) return [];
      return list.map(normalizeEntry).filter((x): x is HWMACaseServiceTypeBundleEntry => x != null);
    };
    try {
      const response = await api.get<Partial<HWMACaseServiceTypeBundleResponse>>('/cases/service/type', {
        headers: {
          'X-Time-Zone': HWMA_X_TIME_ZONE,
        },
      });
      const d = response.data ?? {};
      return {
        pc: normalizeList(d.pc),
        monitor: normalizeList(d.monitor),
        parts: normalizeList(d.parts),
      };
    } catch (error) {
      console.error('取得服務類型／品牌／型號清單失敗:', error);
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

function normalizeReqPirList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.data)) return o.data as T[];
  }
  return [];
}

const reqpirAdminJsonHeaders = {
  'X-Time-Zone': HWMA_X_TIME_ZONE,
  'Content-Type': 'application/json',
} as const;

const reqpirAdminReadHeaders = {
  'X-Time-Zone': HWMA_X_TIME_ZONE,
} as const;

/** GET/POST/PATCH/DELETE /reqpir/items — 品目錄（reqpireditem.json） */
export interface ReqPirItem {
  hri_id: number | string;
  item_category: string;
  item_name: string;
  item_type: string;
  device_model?: string | null;
  is_active?: boolean;
}

export interface ReqPirItemCreateBody {
  item_category: string;
  item_name: string;
  item_type: string;
  device_model?: string;
  is_active?: boolean;
}

/** GET/POST/PATCH/DELETE /reqpir/contracts — 合約價（reqpir_contract.json） */
export interface ReqPirContract {
  hrc_id: number | string;
  hri_id: number | string;
  hrr_id?: number | string | null;
  hrrid?: number | string | null;
  currency: string;
  device_model: string;
  price: number;
  start_date: string;
  is_active?: boolean;
}

export interface ReqPirContractCreateBody {
  hrr_id?: number | string;
  hrrid?: number | string;
  hri_id: number | string;
  currency: string;
  device_model: string;
  price: number;
  start_date: string;
  is_active?: boolean;
}

export const reqpirAdminAPI = {
  listItems: async (): Promise<ReqPirItem[]> => {
    try {
      const response = await api.get<unknown>('/reqpir/items', { headers: reqpirAdminReadHeaders });
      return normalizeReqPirList<ReqPirItem>(response.data);
    } catch (error) {
      console.error('取得品目錄失敗:', error);
      throw error;
    }
  },

  getItem: async (hri_id: string | number): Promise<ReqPirItem> => {
    const encoded = encodeURIComponent(String(hri_id));
    const response = await api.get<ReqPirItem>(`/reqpir/items/${encoded}`, { headers: reqpirAdminReadHeaders });
    return response.data;
  },

  createItem: async (body: ReqPirItemCreateBody): Promise<ReqPirItem> => {
    const response = await api.post<ReqPirItem>('/reqpir/items', body, { headers: reqpirAdminJsonHeaders });
    return response.data;
  },

  patchItem: async (hri_id: string | number, body: Partial<ReqPirItemCreateBody>): Promise<ReqPirItem> => {
    const encoded = encodeURIComponent(String(hri_id));
    const response = await api.patch<ReqPirItem>(`/reqpir/items/${encoded}`, body, { headers: reqpirAdminJsonHeaders });
    return response.data;
  },

  deleteItem: async (hri_id: string | number): Promise<void> => {
    const encoded = encodeURIComponent(String(hri_id));
    await api.delete(`/reqpir/items/${encoded}`, { headers: reqpirAdminReadHeaders });
  },

  listContracts: async (params?: { hri_id?: string | number; hrr_id?: string | number }): Promise<ReqPirContract[]> => {
    try {
      const response = await api.get<unknown>('/reqpir/contracts', {
        params,
        headers: reqpirAdminReadHeaders,
      });
      return normalizeReqPirList<ReqPirContract>(response.data);
    } catch (error) {
      console.error('取得合約價列表失敗:', error);
      throw error;
    }
  },

  getContract: async (hrc_id: string | number): Promise<ReqPirContract> => {
    const encoded = encodeURIComponent(String(hrc_id));
    const response = await api.get<ReqPirContract>(`/reqpir/contracts/${encoded}`, {
      headers: reqpirAdminReadHeaders,
    });
    return response.data;
  },

  createContract: async (body: ReqPirContractCreateBody): Promise<ReqPirContract> => {
    const response = await api.post<ReqPirContract>('/reqpir/contracts', body, { headers: reqpirAdminJsonHeaders });
    return response.data;
  },

  patchContract: async (
    hrc_id: string | number,
    body: Partial<ReqPirContractCreateBody>,
  ): Promise<ReqPirContract> => {
    const encoded = encodeURIComponent(String(hrc_id));
    const response = await api.patch<ReqPirContract>(`/reqpir/contracts/${encoded}`, body, {
      headers: reqpirAdminJsonHeaders,
    });
    return response.data;
  },

  deleteContract: async (hrc_id: string | number): Promise<void> => {
    const encoded = encodeURIComponent(String(hrc_id));
    await api.delete(`/reqpir/contracts/${encoded}`, { headers: reqpirAdminReadHeaders });
  },
};

