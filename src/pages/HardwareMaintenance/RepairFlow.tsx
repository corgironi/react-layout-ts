import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import axios from 'axios';
import styles from './RepairFlow.module.css';
import StepFlow, { StepFlowStep } from '../../components/StepFlow';
import {
  hardwareMaintenanceAPI,
  HWMARepairAvailableAction,
  HWMARepairItem,
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

/**
 * history → 已完成；current_state → 進行中；default_future_paths 於目前節點之後 → 待處理
 */
function buildStepsFromRepairItem(item: HWMARepairItem): StepFlowStep[] {
  const fs = item.flow_status;
  const steps: StepFlowStep[] = [];

  (fs.history ?? []).forEach((h, i) => {
    steps.push({
      id: `history-${h.transaction_id || i}`,
      title: h.action_name || h.to_state_code,
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

  const load = useCallback(async () => {
    if (!rid?.trim()) {
      setLoading(false);
      setError('缺少子單編號');
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
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

  const onFlowAction = (_action: HWMARepairAvailableAction) => {
    // 流程轉移 API 對接後在此呼叫
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

  return (
    <div className={styles.container}>
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
                  onClick={() => onFlowAction(a)}
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
              onClick={() => onFlowAction(a)}
            >
              <span>{a.action_name}</span>
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
    </div>
  );
};

export default RepairFlow;
