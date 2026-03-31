import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import styles from './HardwareMaintenance.module.css';
import WarningBanner, { WarningBannerItem } from '../../components/WarningBanner';
import Card from '../../components/Card';
import Pagination from '../../components/Pagination';
import {
  hardwareMaintenanceAPI,
  HWMADashboardKPI,
  HWMACaseItem,
  HWMACaseListParams,
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

interface RepairFormData {
  reportNumber: string;
  repairPerson: string;
  employeeId: string;
  location: string;
  equipmentName: string;
  problemDescription: string;
  borrowedEquipment: string;
  photos: File[];
}

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
  const [formData, setFormData] = useState<RepairFormData>({
    reportNumber: '',
    repairPerson: '',
    employeeId: '',
    location: '台中',
    equipmentName: '',
    problemDescription: '',
    borrowedEquipment: '',
    photos: []
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof RepairFormData, string>>>({});
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

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

  // 處理表單輸入變更
  const handleInputChange = (field: keyof RepairFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除該欄位的錯誤訊息
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 處理員工工號輸入（限制為6位數字）
  const handleEmployeeIdChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    handleInputChange('employeeId', numericValue);
  };

  // 處理載入資訊
  const handleLoadInfo = async () => {
    if (!formData.reportNumber.trim()) {
      setFormErrors(prev => ({ ...prev, reportNumber: '請輸入報案單號' }));
      return;
    }

    setIsLoadingInfo(true);
    try {
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模擬從其他系統載入的資料
      // 這裡可以根據報案單號從 API 獲取資料
      console.log('載入報案單號資訊:', formData.reportNumber);
      
      // 模擬載入的資料（實際應該從 API 獲取）
      // setFormData(prev => ({
      //   ...prev,
      //   equipmentName: '從系統載入的設備名稱',
      //   // 其他欄位...
      // }));
      
      alert('資訊載入成功（模擬）');
    } catch (error) {
      console.error('載入資訊失敗:', error);
      alert('載入資訊失敗，請檢查報案單號是否正確');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // 處理文件選擇
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length !== files.length) {
      alert('請只上傳圖片檔案');
      return;
    }

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...imageFiles]
    }));
  };

  // 處理文件拖曳
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.add(styles.dragOver);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.remove(styles.dragOver);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.remove(styles.dragOver);
    }
    handleFileSelect(e.dataTransfer.files);
  };

  // 移除照片
  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  // 表單驗證
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof RepairFormData, string>> = {};

    if (!formData.reportNumber.trim()) {
      errors.reportNumber = '請輸入報案單號';
    }

    if (!formData.repairPerson.trim()) {
      errors.repairPerson = '請輸入報修人姓名';
    }

    if (!formData.employeeId.trim()) {
      errors.employeeId = '請輸入員工工號';
    } else if (formData.employeeId.length !== 6) {
      errors.employeeId = '員工工號必須為6位數字';
    }

    if (!formData.location) {
      errors.location = '請選擇地點';
    }

    if (!formData.equipmentName.trim()) {
      errors.equipmentName = '請輸入電腦設備名稱';
    }

    if (!formData.problemDescription.trim()) {
      errors.problemDescription = '請詳細描述電腦問題';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 處理表單提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // 這裡可以調用 API 提交表單
    console.log('提交表單資料:', {
      ...formData,
      photos: formData.photos.map(f => f.name)
    });

    // 模擬提交成功
    alert('報修單新增成功！');
    
    // 重置表單並關閉 Modal
    setFormData({
      reportNumber: '',
      repairPerson: '',
      employeeId: '',
      location: '台中',
      equipmentName: '',
      problemDescription: '',
      borrowedEquipment: '',
      photos: []
    });
    setFormErrors({});
    setIsModalOpen(false);
  };

  // 處理取消
  const handleCancel = () => {
    setFormData({
      reportNumber: '',
      repairPerson: '',
      employeeId: '',
      location: '台中',
      equipmentName: '',
      problemDescription: '',
      borrowedEquipment: '',
      photos: []
    });
    setFormErrors({});
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
                    <td colSpan={15} className={styles.emptyCell}>
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
                        <button type="button" className={styles.actionButton}>
                          <i className="fas fa-list"></i>
                          <span>子單管理</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {!listLoading && !listError && appliedFilters && rawCaseItems.length === 0 && (
                <tr>
                  <td colSpan={15} className={styles.emptyCell}>
                    伺服器無符合日期／狀態條件的資料
                  </td>
                </tr>
              )}
              {!listLoading && !appliedFilters && (
                <tr>
                  <td colSpan={15} className={styles.emptyCell}>
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
              <h3>新增報修單</h3>
              <button 
                className={styles.closeButton}
                onClick={handleCancel}
                aria-label="關閉"
              >
                ×
              </button>
            </div>

            <form className={styles.modalForm} onSubmit={handleSubmit}>
              {/* 報案單號 */}
              <div className={styles.formGroup}>
                <label htmlFor="reportNumber">報案單號</label>
                <div className={styles.inputWithButton}>
                  <input
                    type="text"
                    id="reportNumber"
                    placeholder="例如: Case-2024-001"
                    value={formData.reportNumber}
                    onChange={(e) => handleInputChange('reportNumber', e.target.value)}
                    className={formErrors.reportNumber ? styles.inputError : ''}
                  />
                  <button
                    type="button"
                    className={styles.loadInfoButton}
                    onClick={handleLoadInfo}
                    disabled={isLoadingInfo}
                  >
                    <i className="fas fa-download"></i>
                    <span>{isLoadingInfo ? '載入中...' : '載入資訊'}</span>
                  </button>
                </div>
                {formErrors.reportNumber && (
                  <span className={styles.errorText}>{formErrors.reportNumber}</span>
                )}
                <p className={styles.helpText}>
                  輸入報案單號後點擊「載入資訊」從其他系統匯入電腦資訊
                </p>
              </div>

              {/* 報修人 */}
              <div className={styles.formGroup}>
                <label htmlFor="repairPerson">報修人</label>
                <input
                  type="text"
                  id="repairPerson"
                  placeholder="請輸入報修人姓名"
                  value={formData.repairPerson}
                  onChange={(e) => handleInputChange('repairPerson', e.target.value)}
                  className={formErrors.repairPerson ? styles.inputError : ''}
                />
                {formErrors.repairPerson && (
                  <span className={styles.errorText}>{formErrors.repairPerson}</span>
                )}
              </div>

              {/* 員工工號 */}
              <div className={styles.formGroup}>
                <label htmlFor="employeeId">員工工號</label>
                <input
                  type="text"
                  id="employeeId"
                  placeholder="6位數工號"
                  value={formData.employeeId}
                  onChange={(e) => handleEmployeeIdChange(e.target.value)}
                  maxLength={6}
                  className={formErrors.employeeId ? styles.inputError : ''}
                />
                {formErrors.employeeId && (
                  <span className={styles.errorText}>{formErrors.employeeId}</span>
                )}
              </div>

              {/* 地點 */}
              <div className={styles.formGroup}>
                <label htmlFor="location">地點</label>
                <select
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={formErrors.location ? styles.inputError : ''}
                >
                  <option value="台中">台中</option>
                  <option value="新竹">新竹</option>
                  <option value="高雄">高雄</option>
                  <option value="台北">台北</option>
                </select>
                {formErrors.location && (
                  <span className={styles.errorText}>{formErrors.location}</span>
                )}
              </div>

              {/* 電腦設備名稱 */}
              <div className={styles.formGroup}>
                <label htmlFor="equipmentName">電腦設備名稱</label>
                <input
                  type="text"
                  id="equipmentName"
                  placeholder="例如: Dell Latitude 5420"
                  value={formData.equipmentName}
                  onChange={(e) => handleInputChange('equipmentName', e.target.value)}
                  className={formErrors.equipmentName ? styles.inputError : ''}
                />
                {formErrors.equipmentName && (
                  <span className={styles.errorText}>{formErrors.equipmentName}</span>
                )}
              </div>

              {/* 問題描述 */}
              <div className={styles.formGroup}>
                <label htmlFor="problemDescription">問題描述</label>
                <textarea
                  id="problemDescription"
                  placeholder="請詳細描述電腦問題"
                  value={formData.problemDescription}
                  onChange={(e) => handleInputChange('problemDescription', e.target.value)}
                  rows={4}
                  className={formErrors.problemDescription ? styles.inputError : ''}
                />
                {formErrors.problemDescription && (
                  <span className={styles.errorText}>{formErrors.problemDescription}</span>
                )}
              </div>

              {/* 借用設備資訊 */}
              <div className={styles.formGroup}>
                <label htmlFor="borrowedEquipment">借用設備資訊</label>
                <input
                  type="text"
                  id="borrowedEquipment"
                  placeholder="例如: HP123"
                  value={formData.borrowedEquipment}
                  onChange={(e) => handleInputChange('borrowedEquipment', e.target.value)}
                />
              </div>

              {/* 上傳照片 */}
              <div className={styles.formGroup}>
                <label>上傳照片</label>
                <div
                  ref={uploadAreaRef}
                  className={styles.uploadArea}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    style={{ display: 'none' }}
                  />
                  <div className={styles.uploadContent}>
                    <i className="fas fa-cloud-upload-alt"></i>
                    <p>點擊或拖曳檔案到此處上傳</p>
                    <span className={styles.uploadHint}>支援 JPG、PNG、GIF 格式</span>
                  </div>
                </div>

                {/* 已上傳的照片預覽 */}
                {formData.photos.length > 0 && (
                  <div className={styles.photoPreview}>
                    {formData.photos.map((photo, index) => (
                      <div key={index} className={styles.photoItem}>
                        <img 
                          src={URL.createObjectURL(photo)} 
                          alt={`預覽 ${index + 1}`}
                          className={styles.photoThumbnail}
                        />
                        <button
                          type="button"
                          className={styles.removePhotoButton}
                          onClick={() => handleRemovePhoto(index)}
                          aria-label="移除照片"
                        >
                          ×
                        </button>
                        <span className={styles.photoName}>{photo.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 表單操作按鈕 */}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                >
                  確認
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HWMAHome;
