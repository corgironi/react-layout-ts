import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import styles from './RepairFlow.module.css';
import StepFlow, { StepFlowStep } from '../../components/StepFlow';
import {
  hardwareMaintenanceAPI,
  HWMAPricebookResponse,
  HWMAPricebookRow,
  HWMARepairAvailableAction,
  HWMARepairHistoryEntry,
  HWMARepairItem,
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
  return code === 'VENDOR_ISSUE_SUBMIT';
}

type VendorQuoteLine = {
  key: string;
  item_category: string;
  item_name: string;
  item_spec: string;
  device_model: string;
  count: number;
  remark: string;
};

function lineFromPricebook(row: HWMAPricebookRow): VendorQuoteLine {
  return {
    key: `pb-${row.pricebook_id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    item_category: row.item_category,
    item_name: row.item_name,
    item_spec: row.item_spec,
    device_model: row.device_model,
    count: 1,
    remark: '',
  };
}

/**
 * history → 已完成；current_state → 進行中；default_future_paths 於目前節點之後 → 待處理
 */
function buildStepsFromRepairItem(item: HWMARepairItem): StepFlowStep[] {
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
  const [vendorMsg, setVendorMsg] = useState('');
  const [quoteLines, setQuoteLines] = useState<VendorQuoteLine[]>([]);
  const [pricebook, setPricebook] = useState<HWMAPricebookResponse | null>(null);
  const [pbLoading, setPbLoading] = useState(false);
  const [pbError, setPbError] = useState('');

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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!vendorModalOpen || !data) return;
    let cancelled = false;
    setPbLoading(true);
    setPbError('');
    setPricebook(null);
    hardwareMaintenanceAPI
      .getPricebook(data.hrt_id)
      .then((pb) => {
        if (!cancelled) setPricebook(pb);
      })
      .catch((e) => {
        if (!cancelled) setPbError(parseApiError(e));
      })
      .finally(() => {
        if (!cancelled) setPbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vendorModalOpen, data?.hrt_id]);

  const steps = useMemo(() => (data ? buildStepsFromRepairItem(data) : []), [data]);

  const specialActions = useMemo(
    () => (data?.flow_status.available_actions ?? []).filter((a) => a.is_special === true),
    [data],
  );

  const regularActions = useMemo(
    () => (data?.flow_status.available_actions ?? []).filter((a) => a.is_special !== true),
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
      try {
        const updated = await hardwareMaintenanceAPI.patchTransition(data.detail_ticket_no, {
          action_code: action.action_code,
          context,
        });
        setData(updated);
      } catch (e) {
        setBannerError(parseApiError(e));
      } finally {
        transitionLockRef.current = false;
        setActionBusy(false);
      }
    },
    [data?.detail_ticket_no],
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
      if (line.remark.trim()) base.remark = line.remark.trim();
      return base;
    });
    transitionLockRef.current = true;
    setActionBusy(true);
    setBannerError('');
    try {
      const updated = await hardwareMaintenanceAPI.patchTransition(data.detail_ticket_no, {
        action_code: 'VENDOR_ISSUE_SUBMIT',
        context: {
          repaired_issued_msg: vendorMsg,
          repair_items,
        },
      });
      setData(updated);
      setVendorModalOpen(false);
      setQuoteLines([]);
      setVendorMsg('');
    } catch (e) {
      setBannerError(parseApiError(e));
    } finally {
      transitionLockRef.current = false;
      setActionBusy(false);
    }
  }, [data, quoteLines, vendorMsg]);

  const addPricebookRow = (row: HWMAPricebookRow) => {
    setQuoteLines((prev) => [...prev, lineFromPricebook(row)]);
  };

  const removeQuoteLine = (key: string) => {
    setQuoteLines((prev) => prev.filter((l) => l.key !== key));
  };

  const updateQuoteLine = (key: string, patch: Partial<Pick<VendorQuoteLine, 'count' | 'remark'>>) => {
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

  const warrantyHintLabel =
    pricebook?.device_warranty_hint === 'IN_WARRANTY'
      ? '保固內'
      : pricebook?.device_warranty_hint === 'OUT_WARRANTY'
        ? '保固外'
        : null;

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

      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backInline} onClick={goBack} aria-label="返回子單列表">
            <i className="fas fa-arrow-left" />
          </button>
          <i className="fas fa-wrench" />
          <h1 className={styles.pageTitle}>維修單管理</h1>
        </div>
        <div className={styles.headerRightCluster}>
          {specialActions.length > 0 && (
            <div className={styles.headerSpecialActions}>
              {specialActions.map((a) => (
                <button
                  key={a.action_code}
                  type="button"
                  className={styles.specialActionBtn}
                  title={a.to_state_code ? `→ ${a.to_state_code}` : undefined}
                  disabled={actionBusy}
                  onClick={() => handleAction(a)}
                >
                  {a.action_name}
                </button>
              ))}
            </div>
          )}
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
        {(data.detail_issued_remark || data.detail_issued_context) && (
          <div className={styles.subTicketNote}>
            {data.detail_issued_remark && (
              <p>
                <span className={styles.caseInfoLabel}>子單備註</span>{' '}
                <span className={styles.caseInfoValue}>{data.detail_issued_remark}</span>
              </p>
            )}
            {data.detail_issued_context && (
              <p>
                <span className={styles.caseInfoLabel}>子單內文</span>{' '}
                <span className={styles.caseInfoValue}>{data.detail_issued_context}</span>
              </p>
            )}
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
              disabled={actionBusy}
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
              廠商報價／料件送出（VENDOR_ISSUE_SUBMIT）
            </h3>
            {warrantyHintLabel && (
              <p className={styles.warrantyHint}>
                裝置保固提示：<strong>{warrantyHintLabel}</strong>
                {pricebook?.device_warranty_hint ? `（${pricebook.device_warranty_hint}）` : ''}
              </p>
            )}
            <label className={styles.modalLabel} htmlFor="vendor-msg">
              報價說明（repaired_issued_msg，可空白）
            </label>
            <textarea
              id="vendor-msg"
              className={styles.modalTextarea}
              rows={3}
              value={vendorMsg}
              onChange={(e) => setVendorMsg(e.target.value)}
              disabled={actionBusy}
            />

            <h4 className={styles.modalSubTitle}>價目（Get pricebook）</h4>
            {pbLoading && <p className={styles.modalMuted}>載入價目中…</p>}
            {pbError && <p className={styles.modalError}>{pbError}</p>}
            {!pbLoading && !pbError && pricebook && (
              <div className={styles.pricebookWrap}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>類別</th>
                      <th>品名</th>
                      <th>規格</th>
                      <th>機型</th>
                      <th>單價</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {(pricebook.items ?? []).map((row, idx) => (
                      <tr key={`${row.pricebook_id}-${idx}`}>
                        <td>{row.item_category}</td>
                        <td>{row.item_name}</td>
                        <td>{row.item_spec}</td>
                        <td>{row.device_model}</td>
                        <td>
                          {row.unit_price} {row.currency}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.tableBtn}
                            disabled={actionBusy}
                            onClick={() => addPricebookRow(row)}
                          >
                            加入
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(pricebook.items ?? []).length === 0 && (
                  <p className={styles.modalMuted}>價目無資料。</p>
                )}
              </div>
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
                {actionBusy ? '送出中…' : '送出 VENDOR_ISSUE_SUBMIT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepairFlow;
