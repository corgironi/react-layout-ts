import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import styles from './RepairFlow.module.css';
import StepFlow, { StepFlowStep } from '../../components/StepFlow';
import {
  hardwareMaintenanceAPI,
  HWMARepairItemsByCaseResponse,
  HWMARepairItemOption,
  HWMARepairAvailableAction,
  HWMARepairHistoryEntry,
  HWMARepairItem,
  HWMAWarrantyTypeOption,
  HWMAWarrantyTypeValue,
  HWMAVendorTransitionRepairItem,
} from '../../api/api';

function fmtDisplay(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' && v.trim() === '') return '—';
  return String(v);
}

function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
    ) {
      return (data as { message: string }).message;
    }
    return error.message || '載入失敗';
  }
  return '載入失敗';
}

function formatDateTime(iso: string | null | undefined): string | undefined {
  if (!iso || typeof iso !== 'string') return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
}

/** 時長（秒）→「前綴 + H 小時 M 分 S 秒」 */
function formatDurationHms(seconds: number, prefix: string): string {
  const sec = Math.floor(Math.max(0, seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${prefix}${h} 小時 ${m} 分 ${s} 秒`;
}

/** 目前／未來節點：sla_limit_seconds（上限） */
function formatSlaLabel(seconds: number | null | undefined): string | undefined {
  if (seconds == null || !Number.isFinite(Number(seconds)) || Number(seconds) <= 0) {
    return undefined;
  }
  return formatDurationHms(Number(seconds), '處理時間 ');
}

/** 已過去節點：實際停留／處理耗時 */
function formatElapsedLabel(seconds: number | null | undefined): string | undefined {
  if (seconds == null || !Number.isFinite(Number(seconds)) || Number(seconds) < 0) {
    return undefined;
  }
  return formatDurationHms(Number(seconds), '耗時 ');
}

function historyElapsedSeconds(h: HWMARepairHistoryEntry): number | null {
  if (typeof h.duration_seconds === 'number' && Number.isFinite(h.duration_seconds) && h.duration_seconds >= 0) {
    return Math.floor(h.duration_seconds);
  }
  if (h.entered_at && h.left_at) {
    const a = new Date(h.entered_at).getTime();
    const b = new Date(h.left_at).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b) && b >= a) {
      return Math.floor((b - a) / 1000);
    }
  }
  return null;
}

function isVendorIssueSubmitAction(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  return normalized === 'SUBMIT' || normalized === 'VENDOR_ISSUE_SUBMIT';
}

function isSetRequiredDateAction(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  const match =
    normalized === 'SET_REPQIRED_DATE' ||
    normalized === 'SET_REQUIRED_DATE' ||
    normalized === 'SET_REPAIR_DATE' ||
    normalized === 'SET_REPAIR';
  return match;
}

function isVendorIssueStatus(status: string): boolean {
  return status.trim().toLowerCase() === 'vendor_issue';
}

function isConfirmRequiredDateStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  const match =
    normalized === 'confirm_reqpired_date' || normalized === 'confirm_required_date';
  return match;
}

/** 可維修品項搜尋：比對類別、品名、規格、機型（不分大小寫；多個關鍵字須同時符合） */
function repairItemOptionMatchesSearch(row: HWMARepairItemOption, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const hay = [row.item_category, row.item_name, row.item_spec, row.device_model]
    .map((s) => String(s ?? '').toLowerCase())
    .join(' ');
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

type VendorQuoteLine = {
  key: string;
  item_category: string;
  item_name: string;
  item_spec: string;
  device_model: string;
  count: number;
  warranty_type: HWMAWarrantyTypeValue | '';
  remark: string;
  unit_price?: number | null;
  currency?: string | null;
};

type RepairIssuedContextItem = {
  item_category?: string;
  item_name?: string;
  item_spec?: string;
  device_model?: string;
  count?: number | string;
  warranty_type?: string;
  remark?: string;
};

type RepairIssuedContext = {
  repaired_issued_msg?: string;
  repair_items?: RepairIssuedContextItem[];
};

function lineFromRepairItemOption(row: HWMARepairItemOption): VendorQuoteLine {
  return {
    key: `ri-${row.item_name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    item_category: row.item_category,
    item_name: row.item_name,
    item_spec: row.item_spec,
    device_model: row.device_model,
    count: 1,
    warranty_type: '',
    remark: '',
    unit_price: row.unit_price ?? null,
    currency: row.currency ?? null,
  };
}

function toRepairIssuedContext(value: unknown): RepairIssuedContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as Record<string, unknown>;
  const msg =
    typeof obj.repaired_issued_msg === 'string' ? obj.repaired_issued_msg : undefined;
  const items = Array.isArray(obj.repair_items)
    ? (obj.repair_items as RepairIssuedContextItem[])
    : undefined;
  return {
    repaired_issued_msg: msg,
    repair_items: items,
  };
}

/**
 * history → 已完成；current_state → 進行中；default_future_paths 於目前節點之後 → 待處理
 */
function buildStepsFromRepairItem(
  item: HWMARepairItem,
  activeStepActionButton?: StepFlowStep['actionButton'],
): StepFlowStep[] {
  const fs = item.flow_status;
  const steps: StepFlowStep[] = [];

  (fs.history ?? []).forEach((h, i) => {
    const elapsedSec = historyElapsedSeconds(h);
    steps.push({
      id: `history-${h.transaction_id || i}`,
      title: h.action_name || h.to_state_code,
      slaLabel: formatElapsedLabel(elapsedSec),
      comment:
        h.from_state_code && h.to_state_code && h.from_state_code !== h.to_state_code
          ? `${h.from_state_code} → ${h.to_state_code}`
          : undefined,
      timestamp: formatDateTime(h.entered_at),
      responsible: h.action_by || undefined,
      status: 'completed',
    });
  });

  steps.push({
    id: `current-${fs.current_state.state_code}`,
    title: fs.current_state.name,
    slaLabel: formatSlaLabel(fs.current_state.sla_limit_seconds),
    timestamp: formatDateTime(fs.current_state.entered_at),
    responsible:
      item.current_process_name?.trim() ||
      item.current_process_nt?.trim() ||
      undefined,
    status: 'active',
    actionButton: activeStepActionButton,
  });

  const paths = fs.default_future_paths ?? [];
  const curIdx = paths.findIndex((p) => p.is_current);
  const futureSlice =
    curIdx >= 0 ? paths.slice(curIdx + 1) : paths.filter((p) => !p.is_current && p.is_visible !== false);

  futureSlice.forEach((p, i) => {
    if (p.is_visible === false) return;
    steps.push({
      id: `future-${p.ws_id}-${i}`,
      title: p.state_name,
      slaLabel: formatSlaLabel(p.sla_limit_seconds ?? undefined),
      comment: p.default_transition_action_name || undefined,
      status: 'pending',
    });
  });

  return steps;
}

const RepairFlow = () => {
  const { rid } = useParams<{ rid: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<HWMARepairItem | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const transitionLockRef = useRef(false);

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [requiredDateModalOpen, setRequiredDateModalOpen] = useState(false);
  const [requiredDate, setRequiredDate] = useState('');
  const [vendorMsg, setVendorMsg] = useState('');
  const [quoteLines, setQuoteLines] = useState<VendorQuoteLine[]>([]);
  const [repairItemOptions, setRepairItemOptions] = useState<HWMARepairItemsByCaseResponse>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [warrantyTypeOptions, setWarrantyTypeOptions] = useState<HWMAWarrantyTypeOption[]>([]);
  const [warrantyTypeError, setWarrantyTypeError] = useState('');
  const [repairItemSearchQuery, setRepairItemSearchQuery] = useState('');

  const [bannerSuccess, setBannerSuccess] = useState('');
  const [utilityBusy, setUtilityBusy] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentModalError, setCommentModalError] = useState('');
  const [proxyModalOpen, setProxyModalOpen] = useState(false);
  const [proxyDraft, setProxyDraft] = useState('');
  const [proxyModalError, setProxyModalError] = useState('');

  const load = useCallback(async () => {
    if (!rid?.trim()) {
      setLoading(false);
      setError('缺少子單編號');
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
    setBannerError('');
    setBannerSuccess('');
    setData(null);
    try {
      const res = await hardwareMaintenanceAPI.getRepairedByRid(rid);
      setData(res);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [rid]);

  /** 不切換全頁 loading、不清空畫面；用於 PATCH 成功後補齊與 GET 一致的流程／history */
  const refetchRepairItem = useCallback(async () => {
    if (!rid?.trim()) return;
    try {
      const res = await hardwareMaintenanceAPI.getRepairedByRid(rid);
      setData(res);
    } catch (e) {
      setBannerError(parseApiError(e));
    }
  }, [rid]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!vendorModalOpen || !data) return;
    let cancelled = false;
    setOptionsLoading(true);
    setOptionsError('');
    setRepairItemOptions([]);
    setWarrantyTypeOptions([]);
    setWarrantyTypeError('');
    const caseId = data.parent_ticket?.issued_no?.trim() || String(data.hrt_id);
    Promise.all([
      hardwareMaintenanceAPI.getRepairItemsByCase(caseId),
      hardwareMaintenanceAPI.getWarrantyTypeOptionsByCase(caseId),
    ])
      .then(([itemResp, warrantyResp]) => {
        if (cancelled) return;
        setRepairItemOptions(itemResp);
        setWarrantyTypeOptions(warrantyResp);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = parseApiError(e);
        setOptionsError(msg);
        setWarrantyTypeError(msg);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendorModalOpen, data?.hrt_id, data?.parent_ticket?.issued_no]);

  useEffect(() => {
    if (vendorModalOpen) setRepairItemSearchQuery('');
  }, [vendorModalOpen]);

  const filteredRepairItemOptions = useMemo(
    () => repairItemOptions.filter((row) => repairItemOptionMatchesSearch(row, repairItemSearchQuery)),
    [repairItemOptions, repairItemSearchQuery],
  );

  const vendorIssueAction = useMemo(
    () => (data?.flow_status.available_actions ?? []).find((a) => isVendorIssueSubmitAction(a.action_code)),
    [data],
  );
  const setRequiredDateAction = useMemo(
    () => (data?.flow_status.available_actions ?? []).find((a) => isSetRequiredDateAction(a.action_code)),
    [data],
  );

  const activeStepActionButton = useMemo<StepFlowStep['actionButton'] | undefined>(() => {
    if (!data) return undefined;
    if (isVendorIssueStatus(data.current_status) && vendorIssueAction) {
      return {
        label: '建立維修項目',
        icon: 'fas fa-plus',
        variant: 'primary',
        onClick: () => {
          setVendorMsg('');
          setQuoteLines([]);
          setVendorModalOpen(true);
        },
      };
    }
    if (isConfirmRequiredDateStatus(data.current_status) && setRequiredDateAction) {
      return {
        label: '選擇到料日期',
        icon: 'far fa-calendar-alt',
        variant: 'primary',
        onClick: () => {
          setRequiredDate('');
          setRequiredDateModalOpen(true);
        },
      };
    }
    return undefined;
  }, [data, vendorIssueAction, setRequiredDateAction]);

  const steps = useMemo(
    () => (data ? buildStepsFromRepairItem(data, activeStepActionButton) : []),
    [data, activeStepActionButton],
  );

  const specialActions = useMemo(
    () => (data?.flow_status.available_actions ?? []).filter((a) => a.is_special === true),
    [data],
  );

  const regularActions = useMemo(
    () => {
      const currentStatus = data?.current_status ?? '';
      return (data?.flow_status.available_actions ?? []).filter(
        (a) =>
          a.is_special !== true &&
          !(
            (isVendorIssueStatus(currentStatus) && isVendorIssueSubmitAction(a.action_code)) ||
            (isConfirmRequiredDateStatus(currentStatus) && isSetRequiredDateAction(a.action_code))
          ),
      );
    },
    [data],
  );

  const goBack = () => {
    const issued = data?.parent_ticket?.issued_no?.trim();
    if (issued) {
      navigate(`/hardware-maintenance?caseid=${encodeURIComponent(issued)}`);
    } else {
      navigate('/hardware-maintenance');
    }
  };

  const runTransition = useCallback(
    async (action: HWMARepairAvailableAction, context: Record<string, unknown>) => {
      if (!data?.detail_ticket_no || transitionLockRef.current) return;
      transitionLockRef.current = true;
      setActionBusy(true);
      setBannerError('');
      setBannerSuccess('');
      try {
        const updated = await hardwareMaintenanceAPI.patchTransition(data.detail_ticket_no, {
          action_code: action.action_code,
          context,
        });
        setData(updated);
        await refetchRepairItem();
      } catch (e) {
        setBannerError(parseApiError(e));
      } finally {
        transitionLockRef.current = false;
        setActionBusy(false);
      }
    },
    [data?.detail_ticket_no, refetchRepairItem],
  );

  const handleAction = useCallback(
    async (action: HWMARepairAvailableAction) => {
      if (!data || transitionLockRef.current) return;
      if (isVendorIssueSubmitAction(action.action_code)) {
        setVendorMsg('');
        setQuoteLines([]);
        setVendorModalOpen(true);
        return;
      }
      if (isSetRequiredDateAction(action.action_code)) {
        setRequiredDate('');
        setRequiredDateModalOpen(true);
        return;
      }
      await runTransition(action, {});
    },
    [data, runTransition],
  );

  const submitVendorQuote = useCallback(async () => {
    if (!data || transitionLockRef.current) return;
    if (quoteLines.length < 1) {
      setBannerError('請至少新增一筆報價／料件（自價目選取或手動對應欄位）。');
      return;
    }
    const repair_items: HWMAVendorTransitionRepairItem[] = quoteLines.map((line) => {
      const count = Math.max(1, Math.floor(Number(line.count)) || 1);
      const base: HWMAVendorTransitionRepairItem = {
        item_category: line.item_category,
        item_name: line.item_name,
        item_spec: line.item_spec,
        device_model: line.device_model,
        count,
      };
      if (line.warranty_type) base.warranty_type = line.warranty_type;
      if (line.remark.trim()) base.remark = line.remark.trim();
      return base;
    });
    transitionLockRef.current = true;
    setActionBusy(true);
    setBannerError('');
    setBannerSuccess('');
    try {
      const updated = await hardwareMaintenanceAPI.patchTransition(data.detail_ticket_no, {
        action_code: 'SUBMIT',
        context: {
          repqir_items: repair_items,
          repaired_issued_msg: vendorMsg,
        },
      });
      setData(updated);
      await refetchRepairItem();
      setVendorModalOpen(false);
      setQuoteLines([]);
      setVendorMsg('');
    } catch (e) {
      setBannerError(parseApiError(e));
    } finally {
      transitionLockRef.current = false;
      setActionBusy(false);
    }
  }, [data, quoteLines, vendorMsg, refetchRepairItem]);

  const submitRequiredDate = useCallback(async () => {
    if (!data || !setRequiredDateAction || transitionLockRef.current) return;
    if (!requiredDate) {
      setBannerError('請先選擇日期');
      return;
    }
    await runTransition(setRequiredDateAction, {
      repqir_date: requiredDate,
    });
    setRequiredDateModalOpen(false);
  }, [data, requiredDate, runTransition, setRequiredDateAction]);

  const submitRepairComment = useCallback(async () => {
    if (!data?.detail_ticket_no) return;
    const text = commentDraft.trim();
    if (!text) {
      setCommentModalError('請輸入備註內容');
      return;
    }
    setUtilityBusy(true);
    setCommentModalError('');
    setBannerError('');
    try {
      const res = await hardwareMaintenanceAPI.postRepairComment(data.detail_ticket_no, { comment: text });
      setCommentModalOpen(false);
      setCommentDraft('');
      const when = formatDateTime(res.created_at) ?? res.created_at;
      setBannerSuccess(`備註已送出（${when}）。目前無 GET 可查歷史留言。`);
    } catch (e) {
      setCommentModalError(parseApiError(e));
    } finally {
      setUtilityBusy(false);
    }
  }, [data?.detail_ticket_no, commentDraft]);

  const submitRepairProxy = useCallback(async () => {
    if (!data?.detail_ticket_no) return;
    const name = proxyDraft.trim();
    if (!name) {
      setProxyModalError('請輸入代領人姓名或識別');
      return;
    }
    setUtilityBusy(true);
    setProxyModalError('');
    setBannerError('');
    try {
      const res = await hardwareMaintenanceAPI.postRepairProxy(data.detail_ticket_no, { proxy: name });
      setProxyModalOpen(false);
      setProxyDraft('');
      const when = formatDateTime(res.updated_at) ?? res.updated_at;
      setBannerSuccess(`代領人已設為「${res.proxy}」（${when}）。`);
    } catch (e) {
      setProxyModalError(parseApiError(e));
    } finally {
      setUtilityBusy(false);
    }
  }, [data?.detail_ticket_no, proxyDraft]);

  const addRepairItemOptionRow = (row: HWMARepairItemOption) => {
    setQuoteLines((prev) => [...prev, lineFromRepairItemOption(row)]);
  };

  const removeQuoteLine = (key: string) => {
    setQuoteLines((prev) => prev.filter((l) => l.key !== key));
  };

  const updateQuoteLine = (
    key: string,
    patch: Partial<Pick<VendorQuoteLine, 'count' | 'remark' | 'warranty_type'>>,
  ) => {
    setQuoteLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  if (!rid?.trim()) {
    return (
      <div className={styles.container}>
        <p className={styles.stateError}>路由參數不正確。</p>
        <button type="button" className={styles.backLink} onClick={() => navigate('/hardware-maintenance')}>
          返回列表
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.stateLoading}>載入子單資料中…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container}>
        <button type="button" className={styles.backLink} onClick={() => navigate('/hardware-maintenance')}>
          ← 返回
        </button>
        <p className={styles.stateError} role="alert">
          {error || '無法載入資料'}
        </p>
      </div>
    );
  }

  const pt = data.parent_ticket;
  const siteLine = [pt.issued_site, pt.issued_site_phase].filter(Boolean).join(' ') || '—';
  const issuedContext = toRepairIssuedContext(data.detail_issued_context);

  return (
    <div className={styles.container}>
      {bannerError && (
        <div className={styles.bannerError} role="alert">
          <span>{bannerError}</span>
          <button type="button" className={styles.bannerDismiss} onClick={() => setBannerError('')}>
            關閉
          </button>
        </div>
      )}
      {bannerSuccess && (
        <div className={styles.bannerSuccess} role="status">
          <span>{bannerSuccess}</span>
          <button type="button" className={styles.bannerSuccessDismiss} onClick={() => setBannerSuccess('')}>
            關閉
          </button>
        </div>
      )}

      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backInline} onClick={goBack} aria-label="返回子單列表">
            <i className="fas fa-arrow-left" />
          </button>
          <i className="fas fa-wrench" />
          <h1 className={styles.pageTitle}>維修單管理</h1>
        </div>
        <div className={styles.headerRightCluster}>
          <div className={styles.headerSpecialActions}>
            <button
              type="button"
              className={styles.specialActionBtn}
              title="POST /cases/repairs/:RID/comment"
              disabled={actionBusy || utilityBusy}
              onClick={() => {
                setCommentDraft('');
                setCommentModalError('');
                setCommentModalOpen(true);
              }}
            >
              新增子單備註
            </button>
            <button
              type="button"
              className={styles.specialActionBtn}
              title="POST /cases/reqpir/:RID/proxy"
              disabled={actionBusy || utilityBusy}
              onClick={() => {
                setProxyDraft('');
                setProxyModalError('');
                setProxyModalOpen(true);
              }}
            >
              設定代領人
            </button>
            {specialActions.map((a) => (
              <button
                key={a.action_code}
                type="button"
                className={styles.specialActionBtn}
                title={a.to_state_code ? `→ ${a.to_state_code}` : undefined}
                disabled={actionBusy || utilityBusy}
                onClick={() => handleAction(a)}
              >
                {a.action_name}
              </button>
            ))}
          </div>
          <div className={styles.ridBlock}>
            <span className={styles.ridLabel}>RID</span>
            <span className={styles.ridValue}>{data.detail_ticket_no}</span>
          </div>
        </div>
      </div>

      <div className={styles.caseInfoCard}>
        <div className={styles.caseInfoHeader}>
          <span className={styles.caseNumberLabel}>母單單號</span>
          <span className={styles.caseNumber}>{fmtDisplay(pt.issued_no)}</span>
          <span className={styles.statusChip}>{data.current_status}</span>
        </div>
        <div className={styles.caseInfoGrid}>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>報案者</span>
            <span className={styles.caseInfoValue}>
              {fmtDisplay(pt.reporter_nt_account)}
              {pt.reporter_employee_id ? `（${fmtDisplay(pt.reporter_employee_id)}）` : ''}
            </span>
          </div>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>地點</span>
            <span className={styles.caseInfoValue}>{siteLine}</span>
          </div>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>設備</span>
            <span className={styles.caseInfoValue}>{fmtDisplay(pt.device_name)}</span>
          </div>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>問題描述</span>
            <span className={styles.caseInfoValue}>{fmtDisplay(pt.issue_description)}</span>
          </div>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>目前處理者</span>
            <span className={styles.caseInfoValue}>
              {fmtDisplay(data.current_process_name)}
              {data.current_process_nt ? `（${data.current_process_nt}）` : ''}
            </span>
          </div>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>聯絡電話</span>
            <span className={styles.caseInfoValue}>{fmtDisplay(data.current_process_tel)}</span>
          </div>
        </div>
        {(Boolean(data.detail_issued_remark) || data.detail_issued_context != null) && (
          <div className={styles.subTicketNote}>
            {data.detail_issued_remark && (
              <p>
                <span className={styles.caseInfoLabel}>子單備註</span>{' '}
                <span className={styles.caseInfoValue}>{data.detail_issued_remark}</span>
              </p>
            )}
            <div className={styles.contextWrap}>
              <span className={styles.caseInfoLabel}>子單內文</span>
              {data.detail_issued_context == null ? (
                <span className={styles.caseInfoValue}>-</span>
              ) : typeof data.detail_issued_context === 'string' ? (
                <span className={styles.caseInfoValue}>{data.detail_issued_context || '-'}</span>
              ) : issuedContext ? (
                <div className={styles.contextObjBlock}>
                  <p className={styles.contextMsgRow}>
                    <span className={styles.contextMsgLabel}>repaired_issued_msg：</span>
                    <span className={styles.caseInfoValue}>
                      {issuedContext.repaired_issued_msg?.trim() || '-'}
                    </span>
                  </p>
                  <div className={styles.contextItemsWrap}>
                    <div className={styles.contextItemsTitle}>repair_items</div>
                    {Array.isArray(issuedContext.repair_items) && issuedContext.repair_items.length > 0 ? (
                      <table className={styles.contextTable}>
                        <thead>
                          <tr>
                            <th>item_category</th>
                            <th>item_name</th>
                            <th>item_spec</th>
                            <th>device_model</th>
                            <th>count</th>
                            <th>warranty_type</th>
                            <th>remark</th>
                          </tr>
                        </thead>
                        <tbody>
                          {issuedContext.repair_items.map((it, idx) => (
                            <tr key={`ctx-item-${idx}`}>
                              <td>{it?.item_category ?? '-'}</td>
                              <td>{it?.item_name ?? '-'}</td>
                              <td>{it?.item_spec ?? '-'}</td>
                              <td>{it?.device_model ?? '-'}</td>
                              <td>{it?.count ?? '-'}</td>
                              <td>{it?.warranty_type ?? '-'}</td>
                              <td>{it?.remark ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <span className={styles.caseInfoValue}>-</span>
                    )}
                  </div>
                </div>
              ) : (
                <span className={styles.caseInfoValue}>-</span>
              )}
            </div>
          </div>
        )}
      </div>

      {regularActions.length > 0 && (
        <div className={styles.actionButtons}>
          {regularActions.map((a) => (
            <button
              key={a.action_code}
              type="button"
              className={`${styles.actionBtn} ${
                a.is_default ? styles.actionBtnPrimary : styles.actionBtnSecondary
              }`}
              title={a.to_state_code ? `→ ${a.to_state_code}` : undefined}
              disabled={actionBusy || utilityBusy}
              onClick={() => handleAction(a)}
            >
              <span>{actionBusy ? '處理中…' : a.action_name}</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.flowSection}>
        <h2 className={styles.sectionTitle}>維修流程進度</h2>
        <div className={styles.flowContent}>
          <StepFlow steps={steps} />
        </div>
      </div>

      {vendorModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            if (!actionBusy) setVendorModalOpen(false);
          }}
          role="presentation"
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vendor-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="vendor-modal-title" className={styles.modalTitle}>
              廠商判定維修項目（SUBMIT）
            </h3>

            <h4 className={styles.modalSubTitle}>可維修品項（GET /cases/:case_id/reqpir-items）</h4>
            {optionsLoading && <p className={styles.modalMuted}>載入可維修品項中…</p>}
            {optionsError && <p className={styles.modalError}>{optionsError}</p>}
            {warrantyTypeError && !optionsError && <p className={styles.modalError}>{warrantyTypeError}</p>}
            {!optionsLoading && !optionsError && (
              <>
                <div className={styles.modelInfoCard}>
                  <div className={styles.modelInfoTitle}>目前選擇的料件適用機型</div>
                  <div className={styles.modelInfoValue}>
                    {repairItemOptions[0]?.device_model || data.parent_ticket.device_model || '—'}
                  </div>
                </div>
                <div className={styles.repairItemSearchWrap}>
                  <label className={styles.repairItemSearchLabel} htmlFor="repair-item-search">
                    搜尋品項
                  </label>
                  <input
                    id="repair-item-search"
                    type="search"
                    className={styles.repairItemSearchInput}
                    placeholder="品名、類別、規格或關鍵字（例：ssd、電腦零組件、螢幕）"
                    value={repairItemSearchQuery}
                    onChange={(e) => setRepairItemSearchQuery(e.target.value)}
                    disabled={actionBusy}
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                </div>
                <div className={styles.optionGrid}>
                  {filteredRepairItemOptions.map((row, idx) => (
                    <button
                      key={`${row.item_category}-${row.item_name}-${row.item_spec}-${idx}`}
                      type="button"
                      className={styles.optionCard}
                      disabled={actionBusy}
                      onClick={() => addRepairItemOptionRow(row)}
                    >
                      <div className={styles.optionCategory}>{row.item_category?.trim() || '—'}</div>
                      <div className={styles.optionName}>{row.item_name}</div>
                      <div className={styles.optionSpec}>{row.item_spec || '-'}</div>
                      <div className={styles.optionPrice}>
                        {typeof row.unit_price === 'number'
                          ? `${row.currency ?? 'NT$'} ${row.unit_price}`
                          : '時價'}
                      </div>
                      <span className={styles.optionPlus}>+</span>
                    </button>
                  ))}
                </div>
                {repairItemOptions.length === 0 && (
                  <p className={styles.modalMuted}>可維修品項無資料。</p>
                )}
                {repairItemOptions.length > 0 && filteredRepairItemOptions.length === 0 && (
                  <p className={styles.modalMuted}>沒有符合搜尋條件的品項，請修改關鍵字。</p>
                )}
              </>
            )}

            <h4 className={styles.modalSubTitle}>本次報價項目（至少一筆）</h4>
            {quoteLines.length === 0 ? (
              <p className={styles.modalMuted}>請從上表「加入」或自行於後端擴充手動輸入。</p>
            ) : (
              <div className={styles.quoteTableWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>類別</th>
                      <th>品名</th>
                      <th>規格</th>
                      <th>機型</th>
                      <th>單價</th>
                      <th>保固判定</th>
                      <th>數量</th>
                      <th>備註</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {quoteLines.map((line) => (
                      <tr key={line.key}>
                        <td>{line.item_category}</td>
                        <td>{line.item_name}</td>
                        <td>{line.item_spec}</td>
                        <td>{line.device_model}</td>
                        <td>
                          {typeof line.unit_price === 'number'
                            ? `${line.currency ?? 'NT$'} ${line.unit_price}`
                            : '時價'}
                        </td>
                        <td>
                          <select
                            className={styles.modalSelect}
                            value={line.warranty_type}
                            disabled={actionBusy}
                            onChange={(e) =>
                              updateQuoteLine(line.key, {
                                warranty_type: (e.target.value as HWMAWarrantyTypeValue | '') || '',
                              })
                            }
                          >
                            <option value="">請選擇</option>
                            {warrantyTypeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            className={styles.modalInput}
                            value={line.count}
                            disabled={actionBusy}
                            onChange={(e) =>
                              updateQuoteLine(line.key, {
                                count: Math.max(1, Math.floor(Number(e.target.value)) || 1),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className={styles.modalInputWide}
                            value={line.remark}
                            disabled={actionBusy}
                            onChange={(e) => updateQuoteLine(line.key, { remark: e.target.value })}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.tableBtnDanger}
                            disabled={actionBusy}
                            onClick={() => removeQuoteLine(line.key)}
                          >
                            移除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <label className={styles.modalLabel} htmlFor="vendor-msg">
              廠商判斷項目（repaired_issued_msg）
            </label>
            <textarea
              id="vendor-msg"
              className={styles.modalTextarea}
              rows={3}
              value={vendorMsg}
              onChange={(e) => setVendorMsg(e.target.value)}
              disabled={actionBusy}
              placeholder="請輸入廠商判斷項目說明"
            />

            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                disabled={actionBusy}
                onClick={() => !actionBusy && setVendorModalOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={actionBusy || quoteLines.length < 1}
                onClick={() => void submitVendorQuote()}
              >
                {actionBusy ? '送出中…' : '送出 SUBMIT → 進入下個節點'}
              </button>
            </div>
          </div>
        </div>
      )}

      {requiredDateModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            if (!actionBusy) setRequiredDateModalOpen(false);
          }}
          role="presentation"
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="required-date-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="required-date-modal-title" className={styles.modalTitle}>
              設定預計完修日期
            </h3>
            <label htmlFor="required-date-input" className={styles.modalLabel}>
              到料日期
            </label>
            <input
              id="required-date-input"
              type="date"
              className={styles.modalDateInput}
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
              disabled={actionBusy}
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                disabled={actionBusy}
                onClick={() => setRequiredDateModalOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={actionBusy || !requiredDate}
                onClick={() => void submitRequiredDate()}
              >
                {actionBusy ? '送出中…' : '送出日期'}
              </button>
            </div>
          </div>
        </div>
      )}

      {commentModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            if (!utilityBusy) setCommentModalOpen(false);
          }}
          role="presentation"
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="repair-comment-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="repair-comment-modal-title" className={styles.modalTitle}>
              新增子單備註
            </h3>
            <p className={styles.modalMuted}>
              寫入後端留言檔，不修改子單主檔。目前無 GET 可查歷史留言；若需顯示請後端併入子單 API。
            </p>
            {commentModalError && <p className={styles.modalError}>{commentModalError}</p>}
            <label className={styles.modalLabel} htmlFor="repair-comment-input">
              備註內容（comment）
            </label>
            <textarea
              id="repair-comment-input"
              className={styles.modalTextarea}
              rows={4}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              disabled={utilityBusy}
              placeholder="例：現場已收機"
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                disabled={utilityBusy}
                onClick={() => !utilityBusy && setCommentModalOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={utilityBusy || !commentDraft.trim()}
                onClick={() => void submitRepairComment()}
              >
                {utilityBusy ? '送出中…' : '送出備註'}
              </button>
            </div>
          </div>
        </div>
      )}

      {proxyModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => {
            if (!utilityBusy) setProxyModalOpen(false);
          }}
          role="presentation"
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="repair-proxy-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="repair-proxy-modal-title" className={styles.modalTitle}>
              設定設備代領人
            </h3>
            <p className={styles.modalMuted}>
              路徑為 <code>/cases/reqpir/</code>（專案保留拼字）。同一子單再次送出會覆寫代領人與時間。
            </p>
            {proxyModalError && <p className={styles.modalError}>{proxyModalError}</p>}
            <label className={styles.modalLabel} htmlFor="repair-proxy-input">
              代領人（proxy）
            </label>
            <input
              id="repair-proxy-input"
              type="text"
              className={styles.modalInput}
              value={proxyDraft}
              onChange={(e) => setProxyDraft(e.target.value)}
              disabled={utilityBusy}
              placeholder="例：王小明"
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
                disabled={utilityBusy}
                onClick={() => !utilityBusy && setProxyModalOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                disabled={utilityBusy || !proxyDraft.trim()}
                onClick={() => void submitRepairProxy()}
              >
                {utilityBusy ? '送出中…' : '確認設定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairFlow;
