import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
import styles from './HardwareMaintenance.module.css';
import WarningBanner, { WarningBannerItem } from '../../components/WarningBanner';
import Card from '../../components/Card';
import Pagination from '../../components/Pagination';
import Alert from '../../components/Alert';
import {
  hardwareMaintenanceAPI,
  HWMADashboardKPI,
  HWMACaseCenterPrefillResponse,
  HWMACaseCreateBody,
  HWMACaseItem,
  HWMACaseListParams,
  HWMACaseServiceSiteMap,
  HWMACaseServiceType,
  HWMACaseServiceTypeBundleResponse,
} from '../../api/api';

type IssuedStatusToken = 'null' | 'Progress' | 'Closed';

type AppliedCaseFilters = {
  issuedStatuses: IssuedStatusToken[];
  /** YYYY-MM-DD，僅日期 */
  start_date?: string;
  end_date?: string;
  /** 載入資料後之前端分頁每頁筆數 */
  page_size: number;
};

/** 後端單次請求筆數，用於搜尋時分段拉齊再於前端篩選 */
const HWMA_CASE_LIST_FETCH_CHUNK = 300;

type HwmaCreateFormState = {
  service_type: '' | HWMACaseServiceType;
  issued_no: string;
  issued_site: string;
  issued_site_phase: string;
  reporter_employee_id: string;
  reporter_nt_account: string;
  reporter_phone: string;
  reporter_organization_code: string;
  issue_description: string;
  device_name: string;
  device_brand: string;
  device_model: string;
  device_sn: string;
  device_owner: string;
  borrow_device_name: string;
  created_by_nt_account: string;
  /** YYYY-MM-DD，對應送出欄位 warranty_date */
  warranty_date: string;
  /** true＝裝置已在 IT service center；未勾選時 POST 不送欄位（後端當 false） */
  is_device_at_site: boolean;
};

const getEmptyCreateForm = (): HwmaCreateFormState => ({
  service_type: '',
  issued_no: '',
  issued_site: '',
  issued_site_phase: '',
  reporter_employee_id: '',
  reporter_nt_account: '',
  reporter_phone: '',
  reporter_organization_code: '',
  issue_description: '',
  device_name: '',
  device_brand: '',
  device_model: '',
  device_sn: '',
  device_owner: '',
  borrow_device_name: '',
  created_by_nt_account: '',
  warranty_date: '',
  is_device_at_site: false,
});

const OPTIONAL_CREATE_STRING_KEYS: Array<
  Exclude<keyof HwmaCreateFormState, 'service_type' | 'is_device_at_site'>
> = [
  'issued_no',
  'issued_site',
  'issued_site_phase',
  'reporter_employee_id',
  'reporter_nt_account',
  'reporter_phone',
  'reporter_organization_code',
  'issue_description',
  'device_name',
  'device_brand',
  'device_model',
  'device_sn',
  'device_owner',
  'borrow_device_name',
  'created_by_nt_account',
  'warranty_date',
];

const buildHwmCreateBody = (form: HwmaCreateFormState): HWMACaseCreateBody => {
  const body: HWMACaseCreateBody = {
    service_type: form.service_type as HWMACaseServiceType,
  };
  if (form.is_device_at_site) {
    body.is_device_at_site = true;
  }
  const assign = body as unknown as Record<string, string>;
  for (const key of OPTIONAL_CREATE_STRING_KEYS) {
    const v = form[key].trim();
    if (v) assign[key] = v;
  }
  return body;
};

/** 從 ITCMS 等回傳字串擷取 YYYY-MM-DD 供 date input */
const extractIsoDatePrefix = (raw: string | undefined | null): string => {
  if (raw == null) return '';
  const t = String(raw).trim();
  const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
};

const serviceTypeToBundleCategory = (
  st: HwmaCreateFormState['service_type'],
): keyof HWMACaseServiceTypeBundleResponse | null => {
  if (st === 'PC') return 'pc';
  if (st === 'Monitor') return 'monitor';
  if (st === 'Parts') return 'parts';
  return null;
};

const formatSiteOptionLabel = (siteKey: string, siteValue: string) => {
  if (siteValue === 'null') return `不限（${siteKey}）`;
  return siteValue;
};

const getDefaultKpiData = (): HWMADashboardKPI[] => [
  { title: '維修中案件', value: 0, change: '-', changeType: 'positive', icon: '🔧', color: 'blue' },
  { title: '設備等待', value: 0, change: '-', changeType: 'positive', icon: '⏰', color: 'yellow' },
  { title: '已完成', value: 0, change: '-', changeType: 'positive', icon: '✅', color: 'green' },
  { title: '平均處理時間', value: '-', change: '-', changeType: 'negative', icon: '⏱️', color: 'purple' },
];

const parseListAxiosError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string') {
      return (data as { message: string }).message;
    }
    return error.message || '載入列表失敗，請稍後再試';
  }
  return '載入列表失敗，請稍後再試';
};

const buildListParams = (
  page: number,
  apiPageSize: number,
  filters: Pick<AppliedCaseFilters, 'issuedStatuses' | 'start_date' | 'end_date'>,
): HWMACaseListParams => {
  const params: HWMACaseListParams = {
    page,
    page_size: apiPageSize,
  };
  if (filters.issuedStatuses.length > 0) {
    params.issued_status = filters.issuedStatuses.join(',');
  }
  if (filters.start_date) params.start_datetime = filters.start_date;
  if (filters.end_date) params.end_datetime = filters.end_date;
  return params;
};

/** 後端缺欄、null、空字串時統一顯示字面「null」，避免畫面異常或比對錯誤 */
const displayCaseCell = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' && Number.isNaN(value)) return 'null';
  if (typeof value === 'string' && value.trim() === '') return 'null';
  return String(value);
};

const caseItemFieldTexts = (row: HWMACaseItem): string[] => {
  const r = row as unknown as Record<string, unknown>;
  return [
    displayCaseCell(r.hrt_id),
    displayCaseCell(r.issued_no),
    displayCaseCell(r.issued_site),
    displayCaseCell(r.issued_site_phase),
    displayCaseCell(r.reporter_nt_account),
    displayCaseCell(r.reporter_employee_id),
    displayCaseCell(r.service_type),
    displayCaseCell(row.is_device_at_site),
    displayCaseCell(r.device_name),
    displayCaseCell(r.issue_description),
    displayCaseCell(r.borrow_device_name),
    displayCaseCell(r.parent_case_status),
    displayCaseCell(r.total_sub_tickets),
    displayCaseCell(r.case_created_at),
    displayCaseCell(r.current_processor_role_code),
  ];
};

/** 與表格欄位一致；用於目前分頁內命中欄位數（排序用） */
const keywordFieldHitCount = (row: HWMACaseItem, query: string): number => {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  return caseItemFieldTexts(row).filter((v) => v.toLowerCase().includes(q)).length;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightText = (value: unknown, rawQuery: string): React.ReactNode => {
  const q = rawQuery.trim();
  const t = displayCaseCell(value);
  if (!q) return t;
  try {
    const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    const parts = t.split(re);
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className={styles.keywordMark}>
          {part}
        </mark>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
  } catch {
    return t;
  }
};

const serverFilterKey = (f: Pick<AppliedCaseFilters, 'issuedStatuses' | 'start_date' | 'end_date'>) =>
  JSON.stringify({
    issuedStatuses: [...f.issuedStatuses].sort(),
    start_date: f.start_date ?? '',
    end_date: f.end_date ?? '',
  });

const HWMAHome = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [warningItems] = useState<WarningBannerItem[]>([]);
  const [kpiData] = useState<HWMADashboardKPI[]>(() => getDefaultKpiData());
  const [rawCaseItems, setRawCaseItems] = useState<HWMACaseItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [appliedFilters, setAppliedFilters] = useState<AppliedCaseFilters | null>(null);

  const [draftIssuedStatuses, setDraftIssuedStatuses] = useState<IssuedStatusToken[]>([]);
  /** 僅作用於「目前分頁」列，即時篩選／排序／高亮，不呼叫 API */
  const [quickKeyword, setQuickKeyword] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftPageSize, setDraftPageSize] = useState(10);
  const [createForm, setCreateForm] = useState<HwmaCreateFormState>(() => getEmptyCreateForm());
  const [createFormErrors, setCreateFormErrors] = useState<Partial<Record<keyof HwmaCreateFormState, string>>>(
    {},
  );
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState<{
    caseCenter: boolean;
    itcms: boolean;
  }>({ caseCenter: false, itcms: false });
  const [prefillErrors, setPrefillErrors] = useState<{
    issued_no?: string;
    device_name?: string;
  }>({});
  const [deviceWarrantyDate, setDeviceWarrantyDate] = useState('');
  const [resultAlert, setResultAlert] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({ isOpen: false, title: '', message: '', type: 'success' });

  const [serviceSiteMap, setServiceSiteMap] = useState<HWMACaseServiceSiteMap>({});
  const [serviceTypeBundle, setServiceTypeBundle] = useState<HWMACaseServiceTypeBundleResponse>(() => ({
    pc: [],
    monitor: [],
    parts: [],
  }));
  const [createCatalogLoading, setCreateCatalogLoading] = useState(false);
  const [createCatalogError, setCreateCatalogError] = useState('');

  const siteSelectRows = useMemo(() => {
    const sorted = Object.entries(serviceSiteMap).sort(([a], [b]) => a.localeCompare(b));
    const seenVal = new Set<string>();
    const rows: { siteKey: string; siteValue: string }[] = [];
    for (const [k, v] of sorted) {
      const val = typeof v === 'string' ? v : String(v);
      if (seenVal.has(val)) continue;
      seenVal.add(val);
      rows.push({ siteKey: k, siteValue: val });
    }
    return rows;
  }, [serviceSiteMap]);

  const siteValueSet = useMemo(() => new Set(siteSelectRows.map((r) => r.siteValue)), [siteSelectRows]);

  const bundleCategoryKey = useMemo(
    () => serviceTypeToBundleCategory(createForm.service_type),
    [createForm.service_type],
  );

  const bundleRows = useMemo(() => {
    if (!bundleCategoryKey) return [];
    return serviceTypeBundle[bundleCategoryKey] ?? [];
  }, [bundleCategoryKey, serviceTypeBundle]);

  const brandOptions = useMemo(() => {
    const s = new Set<string>();
    for (const row of bundleRows) {
      if (row.device_brand) s.add(row.device_brand);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [bundleRows]);

  const modelOptions = useMemo(() => {
    const b = createForm.device_brand.trim();
    if (!b) return [];
    const s = new Set<string>();
    for (const row of bundleRows) {
      if (row.device_brand === b && row.device_model) s.add(row.device_model);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [bundleRows, createForm.device_brand]);

  const closeResultAlert = useCallback(() => {
    setResultAlert((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    let cancelled = false;
    setCreateCatalogLoading(true);
    setCreateCatalogError('');
    (async () => {
      try {
        const [sites, bundle] = await Promise.all([
          hardwareMaintenanceAPI.getCaseServiceSites(),
          hardwareMaintenanceAPI.getCaseServiceTypeBundle(),
        ]);
        if (cancelled) return;
        setServiceSiteMap(sites);
        setServiceTypeBundle(bundle);
      } catch {
        if (cancelled) return;
        setCreateCatalogError('站點或設備類型清單載入失敗，請關閉視窗後重開再試。');
        setServiceSiteMap({});
        setServiceTypeBundle({ pc: [], monitor: [], parts: [] });
      } finally {
        if (!cancelled) setCreateCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isModalOpen]);

  // 處理警告項目點擊
  const handleWarningClick = (item: WarningBannerItem) => {
    console.log('警告項目被點擊:', item);
    // 這裡可以添加導航到相關頁面或顯示詳細信息的邏輯
  };

  // 處理警告項目關閉
  const handleWarningDismiss = (itemId: string) => {
    console.log('關閉警告項目:', itemId);
    // 這裡可以添加從狀態中移除項目的邏輯
  };

  const fetchAllRawCases = useCallback(async (filters: AppliedCaseFilters) => {
    setListLoading(true);
    setListError('');
    try {
      const pick = {
        issuedStatuses: filters.issuedStatuses,
        start_date: filters.start_date,
        end_date: filters.end_date,
      };
      let page = 1;
      const merged: HWMACaseItem[] = [];
      let serverTotal = 0;
      for (;;) {
        const data = await hardwareMaintenanceAPI.getCaseList(
          buildListParams(page, HWMA_CASE_LIST_FETCH_CHUNK, pick),
        );
        serverTotal = Number(data.total_count ?? 0);
        const batch = data.items ?? [];
        merged.push(...batch);
        if (batch.length === 0 || merged.length >= serverTotal || batch.length < HWMA_CASE_LIST_FETCH_CHUNK) {
          break;
        }
        page += 1;
      }
      setRawCaseItems(merged);
    } catch (error) {
      console.error('載入 HWMA 報修案例列表失敗:', error);
      setListError(parseListAxiosError(error));
      setRawCaseItems([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  const handleCaseSearch = () => {
    const filters: AppliedCaseFilters = {
      issuedStatuses: [...draftIssuedStatuses],
      start_date: draftStartDate.trim() || undefined,
      end_date: draftEndDate.trim() || undefined,
      page_size: draftPageSize,
    };
    setQuickKeyword('');
    setCurrentPage(1);
    setAppliedFilters(filters);

    const sameServerAsLast =
      appliedFilters &&
      rawCaseItems.length > 0 &&
      serverFilterKey(appliedFilters) === serverFilterKey(filters);

    if (!sameServerAsLast) {
      fetchAllRawCases(filters);
    }
  };

  const toggleDraftStatus = (token: IssuedStatusToken) => {
    setDraftIssuedStatuses((prev) =>
      prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token],
    );
  };

  const listPageSize = appliedFilters?.page_size ?? draftPageSize;

  const totalPages = Math.max(1, Math.ceil(rawCaseItems.length / listPageSize));

  const paginatedRawSlice = useMemo(() => {
    const start = (currentPage - 1) * listPageSize;
    return rawCaseItems.slice(start, start + listPageSize);
  }, [rawCaseItems, currentPage, listPageSize]);

  /** 目前分頁內：命中欄位數多者排前，其餘維持原順序 */
  const displayCaseRows = useMemo(() => {
    const q = quickKeyword.trim();
    const decorated = paginatedRawSlice.map((row, origIdx) => ({
      row,
      origIdx,
      hitCount: q ? keywordFieldHitCount(row, q) : 0,
    }));
    if (!q) return decorated;
    return [...decorated].sort((a, b) => {
      if (b.hitCount !== a.hitCount) return b.hitCount - a.hitCount;
      return a.origIdx - b.origIdx;
    });
  }, [paginatedRawSlice, quickKeyword]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const showQuickSearchNoMatch =
    Boolean(appliedFilters) &&
    rawCaseItems.length > 0 &&
    paginatedRawSlice.length > 0 &&
    quickKeyword.trim() !== '' &&
    displayCaseRows.every((d) => d.hitCount === 0);

  const getParentStatusInfo = (status: string | null | undefined) => {
    if (status === null || status === undefined || status === '') {
      return { text: 'null', className: styles.statusWaiting };
    }
    switch (status) {
      case 'Progress':
        return { text: 'Progress', className: styles.statusRepairing };
      case 'Closed':
        return { text: 'Closed', className: styles.statusCompleted };
      default:
        return { text: status, className: '' };
    }
  };

  const handleCreateFieldChange = (field: keyof HwmaCreateFormState, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (createFormErrors[field]) {
      setCreateFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (field === 'issued_no' || field === 'device_name') {
      setPrefillErrors((prev) => ({ ...prev, [field]: undefined }));
      if (field === 'device_name') {
        setDeviceWarrantyDate('');
      }
    }
  };

  const applyCaseCenterToForm = (data: HWMACaseCenterPrefillResponse) => {
    setCreateForm((prev) => ({
      ...prev,
      issued_no: data.issued_no ?? prev.issued_no,
      issued_site: data.issued_site ?? prev.issued_site,
      issued_site_phase: data.issued_site_phase ?? prev.issued_site_phase,
      reporter_employee_id: data.reporter_employee_id ?? prev.reporter_employee_id,
      reporter_nt_account: data.reporter_nt_account ?? prev.reporter_nt_account,
      reporter_phone: data.reporter_phone ?? prev.reporter_phone,
      reporter_organization_code: data.reporter_organization_code ?? prev.reporter_organization_code,
      issue_description: data.issue_description ?? prev.issue_description,
      device_name: data.device_info?.device_name ?? prev.device_name,
      device_brand: data.device_info?.device_brand ?? prev.device_brand,
      device_model: data.device_info?.device_model ?? prev.device_model,
      device_sn: data.device_info?.device_sn ?? prev.device_sn,
      device_owner: data.device_info?.device_owner ?? prev.device_owner,
    }));
  };

  const handlePrefillCaseCenter = async () => {
    const caseid = createForm.issued_no.trim();
    if (!caseid) {
      setPrefillErrors((prev) => ({ ...prev, issued_no: '請先輸入 caseid（issued_no）' }));
      return;
    }
    setPrefillLoading((prev) => ({ ...prev, caseCenter: true }));
    setPrefillErrors((prev) => ({ ...prev, issued_no: undefined }));
    try {
      const data = await hardwareMaintenanceAPI.getCaseCenterPrefill(caseid);
      applyCaseCenterToForm(data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setPrefillErrors((prev) => ({ ...prev, issued_no: '查無資料' }));
      } else if (axios.isAxiosError(error) && error.response?.status === 500) {
        setResultAlert({
          isOpen: true,
          type: 'error',
          title: '資料錯誤',
          message: 'Case Center 資料取得失敗，請稍後再試或手動輸入。',
        });
      } else {
        setPrefillErrors((prev) => ({ ...prev, issued_no: '資料錯誤' }));
      }
    } finally {
      setPrefillLoading((prev) => ({ ...prev, caseCenter: false }));
    }
  };

  const handlePrefillItcms = async () => {
    const deviceName = createForm.device_name.trim();
    if (!deviceName) {
      setPrefillErrors((prev) => ({ ...prev, device_name: '請先輸入 device_name' }));
      return;
    }
    setPrefillLoading((prev) => ({ ...prev, itcms: true }));
    setPrefillErrors((prev) => ({ ...prev, device_name: undefined }));
    try {
      const data = await hardwareMaintenanceAPI.getItcmsDeviceInfo(deviceName);
      const fromItcms = extractIsoDatePrefix(data.device_warranty_date);
      setCreateForm((prev) => ({
        ...prev,
        device_name: data.device_name ?? prev.device_name,
        device_brand: data.device_brand ?? prev.device_brand,
        device_model: data.device_model ?? prev.device_model,
        device_sn: data.device_sn ?? prev.device_sn,
        device_owner: data.device_owner ?? prev.device_owner,
        warranty_date: fromItcms || prev.warranty_date,
      }));
      setDeviceWarrantyDate(data.device_warranty_date ?? '');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setPrefillErrors((prev) => ({ ...prev, device_name: '查無資料' }));
      } else if (axios.isAxiosError(error) && error.response?.status === 500) {
        setResultAlert({
          isOpen: true,
          type: 'error',
          title: '資料錯誤',
          message: 'ITCMS 設備資料取得失敗，請稍後再試或手動輸入。',
        });
      } else {
        setPrefillErrors((prev) => ({ ...prev, device_name: '資料錯誤' }));
      }
    } finally {
      setPrefillLoading((prev) => ({ ...prev, itcms: false }));
    }
  };

  const validateCreateForm = (): boolean => {
    const errors: Partial<Record<keyof HwmaCreateFormState, string>> = {};
    if (!createForm.service_type) {
      errors.service_type = '請選擇 service_type（PC / Parts / Monitor）';
    }
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) return;

    setCreateSubmitting(true);
    try {
      const body = buildHwmCreateBody(createForm);
      const created = await hardwareMaintenanceAPI.createCase(body);
      if (appliedFilters) {
        setRawCaseItems((prev) => [created, ...prev]);
        setCurrentPage(1);
      }
      setCreateForm(getEmptyCreateForm());
      setCreateFormErrors({});
      setPrefillErrors({});
      setDeviceWarrantyDate('');
      setIsModalOpen(false);
      const no = displayCaseCell(created.issued_no);
      const hid = displayCaseCell(created.hrt_id);
      setResultAlert({
        isOpen: true,
        type: 'success',
        title: '建立成功',
        message: `HWMA 報修案例已建立。issued_no：${no}，hrt_id：${hid}。`,
      });
    } catch (error) {
      setResultAlert({
        isOpen: true,
        type: 'error',
        title: '建立失敗',
        message: parseListAxiosError(error),
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleCancel = () => {
    setCreateForm(getEmptyCreateForm());
    setCreateFormErrors({});
    setPrefillErrors({});
    setDeviceWarrantyDate('');
    setIsModalOpen(false);
  };

  // 按 ESC 鍵關閉 Modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCancel();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const handleListPageChange = (page: number) => {
    if (!appliedFilters) return;
    setCurrentPage(page);
  };

  return (
    <div className={styles.container}>
      {/* 警告橫幅 - 使用 medium 尺寸 */}
      <WarningBanner
        items={warningItems}
        size="medium"
        onItemClick={handleWarningClick}
        onDismiss={handleWarningDismiss}
      />

      {/* KPI 卡片區域 */}
      <div className={styles.kpiSection}>
        {kpiData.map((kpi, index) => (
          <Card
            key={index}
            variant="default"
            size="medium"
            borderColor={kpi.color as 'blue' | 'yellow' | 'green' | 'purple'}
            icon={kpi.icon}
            iconPosition="left"
            iconSize="medium"
            isClickable={true}
            onClick={() => console.log(`點擊了 ${kpi.title}`)}
            className={styles.kpiCard}
          >
            <div className={styles.kpiContent}>
              <div className={styles.kpiTitle}>{kpi.title}</div>
              <div className={styles.kpiValue}>{String(kpi.value)}</div>
              <div className={`${styles.kpiChange} ${kpi.changeType === 'positive' ? styles.positive : styles.negative}`}>
                {kpi.change ?? '-'}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* HWMA 報修案例列表 */}
      <div className={styles.repairOrderSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <i className="fas fa-file-alt"></i>
            <span>HWMA 報修案例列表</span>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.addButton} onClick={() => setIsModalOpen(true)}>
              <i className="fas fa-plus"></i>
              <span>新增報修</span>
            </button>
          </div>
        </div>

        <div className={styles.caseListFilterStack}>
          <div className={styles.caseListFiltersApi}>
            <div className={styles.caseListApiInline}>
              <span className={styles.caseListApiLabel}>issued_status</span>
              <div className={styles.caseListStatusChecks} role="group" aria-label="issued_status">
                <label className={styles.caseListCheckbox}>
                  <input
                    type="checkbox"
                    checked={draftIssuedStatuses.includes('null')}
                    onChange={() => toggleDraftStatus('null')}
                  />
                  <span>null</span>
                </label>
                <label className={styles.caseListCheckbox}>
                  <input
                    type="checkbox"
                    checked={draftIssuedStatuses.includes('Progress')}
                    onChange={() => toggleDraftStatus('Progress')}
                  />
                  <span>Progress</span>
                </label>
                <label className={styles.caseListCheckbox}>
                  <input
                    type="checkbox"
                    checked={draftIssuedStatuses.includes('Closed')}
                    onChange={() => toggleDraftStatus('Closed')}
                  />
                  <span>Closed</span>
                </label>
              </div>
            </div>

            <label className={styles.caseListApiInline}>
              <span className={styles.caseListApiLabel}>start_date</span>
              <input
                type="date"
                className={styles.caseListDateInput}
                value={draftStartDate}
                onChange={(e) => setDraftStartDate(e.target.value)}
              />
            </label>
            <label className={styles.caseListApiInline}>
              <span className={styles.caseListApiLabel}>end_date</span>
              <input
                type="date"
                className={styles.caseListDateInput}
                value={draftEndDate}
                onChange={(e) => setDraftEndDate(e.target.value)}
              />
            </label>
            <label className={`${styles.caseListApiInline} ${styles.caseListPageSizeField}`}>
              <span className={styles.caseListApiLabel}>page_size</span>
              <select
                className={`${styles.filterSelect} ${styles.caseListControlTall} ${styles.caseListPageSizeSelect}`}
                value={draftPageSize}
                onChange={(e) => setDraftPageSize(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
            <button type="button" className={styles.searchSubmitButton} onClick={handleCaseSearch}>
              <i className="fas fa-search"></i>
              <span>搜尋</span>
            </button>
          </div>

          <div className={styles.caseListQuickBar}>
            <div className={styles.caseListQuickInner}>
              <span className={styles.caseListApiLabel}>快速搜尋（前端 · 僅目前分頁）</span>
              <div
                className={`${styles.caseListKeywordWrap} ${styles.caseListKeywordWrapGrow} ${styles.caseListQuickKeywordWrap}`}
              >
                <i className={`fas fa-bolt ${styles.caseListKeywordIcon}`} aria-hidden />
                <input
                  type="search"
                  className={styles.caseListKeywordInput}
                  placeholder="即時篩選本頁列、高亮並將命中列排序至前方…"
                  value={quickKeyword}
                  onChange={(e) => setQuickKeyword(e.target.value)}
                  autoComplete="off"
                  disabled={!appliedFilters || rawCaseItems.length === 0}
                />
              </div>
            </div>
            <span className={`${styles.caseListFilterHint} ${styles.caseListQuickHint}`}>
              不另打 API；只影響目前頁面上已顯示的列。換頁後請重新輸入或確認該頁是否仍有目標資料。
            </span>
          </div>
        </div>

        {listLoading && <div className={styles.pageState}>載入列表中...</div>}
        {!listLoading && listError && <div className={styles.errorState}>{listError}</div>}

        <div className={styles.tableWrapper}>
          <table className={styles.repairTable}>
            <thead>
              <tr>
                <th>hrt_id</th>
                <th>issued_no</th>
                <th>issued_site</th>
                <th>issued_site_phase</th>
                <th>reporter_nt_account</th>
                <th>reporter_employee_id</th>
                <th>service_type</th>
                <th>is_device_at_site</th>
                <th>device_name</th>
                <th>issue_description</th>
                <th>borrow_device_name</th>
                <th>parent_case_status</th>
                <th>total_sub_tickets</th>
                <th>case_created_at</th>
                <th>current_processor_role_code</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {!listLoading && !listError && showQuickSearchNoMatch && (
                  <tr>
                    <td colSpan={16} className={styles.emptyCell}>
                      本頁無符合「{quickKeyword.trim()}」的列（可換頁或使用上方 API 搜尋縮小範圍）
                    </td>
                  </tr>
                )}
              {!listLoading &&
                !listError &&
                !showQuickSearchNoMatch &&
                appliedFilters &&
                rawCaseItems.length > 0 &&
                displayCaseRows.map(({ row, hitCount, origIdx }) => {
                  const statusInfo = getParentStatusInfo(row.parent_case_status);
                  const q = quickKeyword;
                  return (
                    <tr
                      key={`hwma-${currentPage}-${origIdx}`}
                      className={hitCount > 0 ? styles.keywordHitRow : undefined}
                    >
                      <td>{highlightText(row.hrt_id, q)}</td>
                      <td>{highlightText(row.issued_no, q)}</td>
                      <td>{highlightText(row.issued_site, q)}</td>
                      <td>{highlightText(row.issued_site_phase, q)}</td>
                      <td>{highlightText(row.reporter_nt_account, q)}</td>
                      <td>{highlightText(row.reporter_employee_id, q)}</td>
                      <td>{highlightText(row.service_type, q)}</td>
                      <td>{highlightText(row.is_device_at_site, q)}</td>
                      <td>{highlightText(row.device_name, q)}</td>
                      <td className={styles.caseCellDesc}>{highlightText(row.issue_description, q)}</td>
                      <td>{highlightText(row.borrow_device_name, q)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusInfo.className}`}>
                          {highlightText(statusInfo.text, q)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.subOrderBadge}>{highlightText(row.total_sub_tickets, q)}</span>
                      </td>
                      <td>{highlightText(row.case_created_at, q)}</td>
                      <td>{highlightText(row.current_processor_role_code, q)}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={() =>
                            navigate(
                              `/hardware-maintenance?caseid=${encodeURIComponent(String(row.issued_no))}`,
                            )
                          }
                        >
                          <i className="fas fa-list"></i>
                          <span>子單管理</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {!listLoading && !listError && appliedFilters && rawCaseItems.length === 0 && (
                <tr>
                  <td colSpan={16} className={styles.emptyCell}>
                    伺服器無符合日期／狀態條件的資料
                  </td>
                </tr>
              )}
              {!listLoading && !appliedFilters && (
                <tr>
                  <td colSpan={16} className={styles.emptyCell}>
                    請設定條件後點擊「搜尋」載入列表（請求皆帶 X-Time-Zone: Asia/Taipei）
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.paginationWrapper}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handleListPageChange}
          />
        </div>
      </div>

      {/* 新增報修單 Modal */}
      {isModalOpen && (
        <div 
          className={styles.modalOverlay}
          onClick={handleCancel}
        >
          <div 
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>新增 HWMA 報修案例</h3>
              <button
                type="button"
                className={styles.closeButton}
                onClick={handleCancel}
                aria-label="關閉"
              >
                ×
              </button>
            </div>

            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <p className={styles.helpText}>
                可先輸入 issued_no（case id）並按「get case center data」預填。必填：service_type。其餘欄位可留空（不送出）；勿填 hrt_id 與時間，由後端產生。
                issued_site 來自 GET /cases/service/site（選項 value 為對照字串，含字面 {'"null"'} 表不限）；device_brand／device_model
                來自 GET /cases/service/type，依 service_type 連動。warranty_date 為日期（YYYY-MM-DD）。
                is_device_at_site：勾選表示裝置已在 IT service center；未勾選則不送該欄位（後端當 false）。
              </p>
              {createCatalogLoading && (
                <p className={styles.helpText}>載入站點與設備類型清單中…</p>
              )}
              {createCatalogError && <span className={styles.errorText}>{createCatalogError}</span>}

              <div className={styles.formGroup}>
                <label htmlFor="hwma-issued_no">issued_no</label>
                <div className={styles.inputWithButton}>
                  <input
                    id="hwma-issued_no"
                    type="text"
                    value={createForm.issued_no}
                    onChange={(e) => handleCreateFieldChange('issued_no', e.target.value)}
                    placeholder="輸入 caseid（issued_no）"
                  />
                  <button
                    type="button"
                    className={styles.loadInfoButton}
                    onClick={handlePrefillCaseCenter}
                    disabled={prefillLoading.caseCenter}
                  >
                    {prefillLoading.caseCenter ? '讀取中…' : 'get case center data'}
                  </button>
                </div>
                {prefillErrors.issued_no && <span className={styles.errorText}>{prefillErrors.issued_no}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hwma-service_type">service_type（必填）</label>
                <select
                  id="hwma-service_type"
                  value={createForm.service_type}
                  onChange={(e) => {
                    const v = e.target.value as HwmaCreateFormState['service_type'];
                    setCreateForm((prev) => ({ ...prev, service_type: v, device_brand: '', device_model: '' }));
                    setCreateFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.service_type;
                      delete next.device_brand;
                      delete next.device_model;
                      return next;
                    });
                  }}
                  className={createFormErrors.service_type ? styles.inputError : ''}
                >
                  <option value="">請選擇</option>
                  <option value="PC">PC</option>
                  <option value="Parts">Parts</option>
                  <option value="Monitor">Monitor</option>
                </select>
                {createFormErrors.service_type && (
                  <span className={styles.errorText}>{createFormErrors.service_type}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel} htmlFor="hwma-is_device_at_site">
                  <input
                    id="hwma-is_device_at_site"
                    type="checkbox"
                    checked={createForm.is_device_at_site}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, is_device_at_site: e.target.checked }))
                    }
                  />
                  <span>裝置已在 IT service center（is_device_at_site）</span>
                </label>
                <p className={styles.helpText} style={{ marginTop: '0.35rem' }}>
                  勾選後 POST 會送 <code>true</code>；未勾選不送欄位，後端視為 false。
                </p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hwma-device_brand">device_brand</label>
                <select
                  id="hwma-device_brand"
                  value={createForm.device_brand}
                  disabled={!bundleCategoryKey || createCatalogLoading}
                  onChange={(e) => {
                    const next = e.target.value;
                    setCreateForm((prev) => ({ ...prev, device_brand: next, device_model: '' }));
                    if (createFormErrors.device_brand) {
                      setCreateFormErrors((prev) => {
                        const n = { ...prev };
                        delete n.device_brand;
                        return n;
                      });
                    }
                  }}
                >
                  <option value="">請選擇（可留空）</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  {createForm.device_brand.trim() !== '' &&
                    !brandOptions.includes(createForm.device_brand.trim()) && (
                      <option value={createForm.device_brand.trim()}>
                        {createForm.device_brand.trim()}（未在清單，仍送出此值）
                      </option>
                    )}
                </select>
                {!bundleCategoryKey && (
                  <span className={styles.helpText}>請先選擇 service_type（PC／Monitor／Parts）以載入品牌。</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hwma-device_model">device_model</label>
                <select
                  id="hwma-device_model"
                  value={createForm.device_model}
                  disabled={!createForm.device_brand.trim() || createCatalogLoading}
                  onChange={(e) => handleCreateFieldChange('device_model', e.target.value)}
                >
                  <option value="">請選擇（可留空）</option>
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                  {createForm.device_model.trim() !== '' &&
                    !modelOptions.includes(createForm.device_model.trim()) && (
                      <option value={createForm.device_model.trim()}>
                        {createForm.device_model.trim()}（未在清單，仍送出此值）
                      </option>
                    )}
                </select>
                {createForm.device_brand.trim() === '' && (
                  <span className={styles.helpText}>請先選擇 device_brand 以載入型號（僅品牌無型號時可留空）。</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hwma-issued_site">issued_site</label>
                <select
                  id="hwma-issued_site"
                  value={createForm.issued_site}
                  disabled={createCatalogLoading}
                  onChange={(e) => handleCreateFieldChange('issued_site', e.target.value)}
                >
                  <option value="">請選擇（可留空）</option>
                  {siteSelectRows.map(({ siteKey, siteValue }) => (
                    <option key={siteKey} value={siteValue}>
                      {formatSiteOptionLabel(siteKey, siteValue)}
                    </option>
                  ))}
                  {createForm.issued_site.trim() !== '' &&
                    !siteValueSet.has(createForm.issued_site.trim()) && (
                      <option value={createForm.issued_site.trim()}>
                        {createForm.issued_site.trim()}（未在對照表）
                      </option>
                    )}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="hwma-issued_site_phase">issued_site_phase</label>
                <input
                  id="hwma-issued_site_phase"
                  type="text"
                  value={createForm.issued_site_phase}
                  onChange={(e) => handleCreateFieldChange('issued_site_phase', e.target.value)}
                  placeholder="例：F2"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hwma-reporter_employee_id">reporter_employee_id</label>
                <input
                  id="hwma-reporter_employee_id"
                  type="text"
                  value={createForm.reporter_employee_id}
                  onChange={(e) => handleCreateFieldChange('reporter_employee_id', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="hwma-reporter_nt_account">reporter_nt_account</label>
                <input
                  id="hwma-reporter_nt_account"
                  type="text"
                  value={createForm.reporter_nt_account}
                  onChange={(e) => handleCreateFieldChange('reporter_nt_account', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="hwma-reporter_phone">reporter_phone</label>
                <input
                  id="hwma-reporter_phone"
                  type="text"
                  value={createForm.reporter_phone}
                  onChange={(e) => handleCreateFieldChange('reporter_phone', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="hwma-reporter_organization_code">reporter_organization_code</label>
                <input
                  id="hwma-reporter_organization_code"
                  type="text"
                  value={createForm.reporter_organization_code}
                  onChange={(e) => handleCreateFieldChange('reporter_organization_code', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hwma-issue_description">issue_description</label>
                <textarea
                  id="hwma-issue_description"
                  rows={3}
                  value={createForm.issue_description}
                  onChange={(e) => handleCreateFieldChange('issue_description', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hwma-device_name">device_name</label>
                <div className={styles.inputWithButton}>
                  <input
                    id="hwma-device_name"
                    type="text"
                    value={createForm.device_name}
                    onChange={(e) => handleCreateFieldChange('device_name', e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.loadInfoButton}
                    onClick={handlePrefillItcms}
                    disabled={prefillLoading.itcms}
                  >
                    {prefillLoading.itcms ? '讀取中…' : 'get itcms data'}
                  </button>
                </div>
                {prefillErrors.device_name && <span className={styles.errorText}>{prefillErrors.device_name}</span>}
                {deviceWarrantyDate && (
                  <span className={styles.helpText}>device_warranty_date：{deviceWarrantyDate}</span>
                )}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="hwma-device_sn">device_sn</label>
                <input
                  id="hwma-device_sn"
                  type="text"
                  value={createForm.device_sn}
                  onChange={(e) => handleCreateFieldChange('device_sn', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="hwma-device_owner">device_owner</label>
                <input
                  id="hwma-device_owner"
                  type="text"
                  value={createForm.device_owner}
                  onChange={(e) => handleCreateFieldChange('device_owner', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hwma-borrow_device_name">borrow_device_name</label>
                <input
                  id="hwma-borrow_device_name"
                  type="text"
                  value={createForm.borrow_device_name}
                  onChange={(e) => handleCreateFieldChange('borrow_device_name', e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="hwma-created_by_nt_account">created_by_nt_account</label>
                <input
                  id="hwma-created_by_nt_account"
                  type="text"
                  value={createForm.created_by_nt_account}
                  onChange={(e) => handleCreateFieldChange('created_by_nt_account', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hwma-warranty_date">warranty_date</label>
                <input
                  id="hwma-warranty_date"
                  type="date"
                  value={createForm.warranty_date}
                  onChange={(e) => handleCreateFieldChange('warranty_date', e.target.value)}
                />
                <span className={styles.helpText}>格式 YYYY-MM-DD；留空則不送出。get itcms data 若帶回保固日會嘗試填入。</span>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={handleCancel} disabled={createSubmitting}>
                  取消
                </button>
                <button type="submit" className={styles.submitButton} disabled={createSubmitting}>
                  {createSubmitting ? '送出中…' : '建立'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Alert
        isOpen={resultAlert.isOpen}
        title={resultAlert.title}
        message={resultAlert.message}
        type={resultAlert.type}
        confirmText="確認"
        cancelText="關閉"
        onConfirm={closeResultAlert}
        onCancel={closeResultAlert}
      />
    </div>
  );
};

export default HWMAHome;
