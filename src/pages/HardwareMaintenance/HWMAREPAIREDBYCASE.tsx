import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import axios from 'axios';
import styles from './HWMAREPAIREDBYCASE.module.css';
import {
  hardwareMaintenanceAPI,
  HWMARepairByCaseResponse,
  HWMARepairFlowStatus,
  HWMARepairItem,
} from '../../api/api';

const fmt = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string' && v.trim() === '') return 'null';
  return String(v);
};

const parseApiError = (error: unknown): string => {
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
};

/**
 * 完成度：總步數 = history 長度 + default_future_paths 長度 + 1（目前節點）
 * 目前步序 = history 長度 + 1（已完成 history 筆轉移後所在步）
 */
function repairFlowCompletionPct(fs: HWMARepairFlowStatus): number {
  const h = fs.history?.length ?? 0;
  const f = fs.default_future_paths?.length ?? 0;
  const totalSteps = h + f + 1;
  const currentStep = h + 1;
  if (totalSteps <= 0) return 0;
  const pct = Math.round((currentStep / totalSteps) * 100);
  return Math.min(100, Math.max(0, pct));
}

function sumHistoryDurationLabel(history: HWMARepairFlowStatus['history']): string {
  const sec = (history ?? []).reduce(
    (a, x) => a + (typeof x.duration_seconds === 'number' ? x.duration_seconds : 0),
    0,
  );
  if (sec <= 0) return '—';
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}天 ${h}小時`;
  if (h > 0) return `${h}小時`;
  if (m > 0) return `${m}分鐘`;
  return `${sec}秒`;
}

const HWMAREPAIREDBYCASE = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const caseid = searchParams.get('caseid')?.trim() ?? '';

  const [loading, setLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState<HWMARepairByCaseResponse | null>(null);

  const load = useCallback(async () => {
    if (!caseid) return;
    setLoading(true);
    setError('');
    setCreateError('');
    setData(null);
    try {
      const res = await hardwareMaintenanceAPI.getRepairedByIssuedNo(caseid);
      setData(res);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [caseid]);

  useEffect(() => {
    if (caseid) load();
  }, [caseid, load]);

  const goBack = () => {
    navigate('/hardware-maintenance');
  };

  const openDetail = (item: HWMARepairItem) => {
    navigate(`/hardware-maintenance/${encodeURIComponent(item.detail_ticket_no)}`);
  };

  const createSubTicket = async () => {
    if (!caseid || createLoading) return;
    setCreateLoading(true);
    setCreateError('');
    try {
      await hardwareMaintenanceAPI.createRepairByCaseId(caseid);
      await load();
    } catch (e) {
      setCreateError(parseApiError(e));
    } finally {
      setCreateLoading(false);
    }
  };

  const issuedNoDisplay =
    data?.items?.[0]?.parent_ticket?.issued_no?.trim() || caseid;

  const parentSnapshot = data?.items?.[0]?.parent_ticket;

  if (!caseid) {
    return (
      <div className={styles.page}>
        <button type="button" className={styles.backBtn} onClick={goBack}>
          <i className="fas fa-arrow-left" />
          返回報修列表
        </button>
        <p className={styles.stateMuted}>請在網址加上 query：<code>?caseid=母單編號</code></p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.titleBlock}>
          <button type="button" className={styles.backBtn} onClick={goBack}>
            <i className="fas fa-arrow-left" />
            返回報修列表
          </button>
          <h1 className={styles.pageTitle}>
            <i className="fas fa-folder-open" />
            子單管理
          </h1>
          <p className={styles.subtitle}>
            <span className={styles.subtitleMuted}>母單編號：</span>
            <span className={styles.subtitleIssued}>{issuedNoDisplay}</span>
          </p>
        </div>
        {data && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>子單總數</div>
            <div className={styles.summaryValue}>{data.total_count}</div>
            <button
              type="button"
              className={styles.createSubBtn}
              onClick={() => void createSubTicket()}
              disabled={createLoading}
            >
              {createLoading ? '建立中…' : '新建子單'}
            </button>
          </div>
        )}
      </div>
      {createError && (
        <div className={`${styles.stateBox} ${styles.stateError}`} role="alert">
          {createError}
        </div>
      )}

      {loading && <div className={`${styles.stateBox} ${styles.stateLoading}`}>載入中…</div>}
      {!loading && error && (
        <div className={`${styles.stateBox} ${styles.stateError}`} role="alert">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {parentSnapshot && (
            <div className={styles.parentCard}>
              <div className={styles.parentGrid}>
                <div className={styles.parentField}>
                  <span className={styles.parentLabel}>報案者</span>
                  <span className={styles.parentValueBold}>{fmt(parentSnapshot.reporter_nt_account)}</span>
                </div>
                <div className={styles.parentField}>
                  <span className={styles.parentLabel}>員工工號</span>
                  <span className={styles.parentValueBold}>{fmt(parentSnapshot.reporter_employee_id)}</span>
                </div>
                <div className={styles.parentField}>
                  <span className={styles.parentLabel}>地點</span>
                  <span className={styles.parentValueBold}>
                    {[parentSnapshot.issued_site, parentSnapshot.issued_site_phase]
                      .filter(Boolean)
                      .join(' ') || 'null'}
                  </span>
                </div>
                <div className={styles.parentField}>
                  <span className={styles.parentLabel}>設備</span>
                  <span className={styles.parentValueBold}>{fmt(parentSnapshot.device_name)}</span>
                </div>
                <div className={styles.parentField}>
                  <span className={styles.parentLabel}>借用設備</span>
                  <span className={styles.parentValueBold}>{fmt(parentSnapshot.borrow_device_name)}</span>
                </div>
              </div>
              <div className={styles.issueRow}>
                <span className={styles.parentLabel}>問題描述</span>
                <p className={styles.parentValue} style={{ margin: '0.35rem 0 0' }}>
                  {fmt(parentSnapshot.issue_description)}
                </p>
              </div>
            </div>
          )}

          <h2 className={styles.sectionTitle}>維修子單列表</h2>
          <div className={styles.subList}>
            {data.items.length === 0 && <p className={styles.stateMuted}>尚無子單資料</p>}
            {data.items.map((item) => {
              const fs = item.flow_status;
              const pct = repairFlowCompletionPct(fs);
              const durationLabel = sumHistoryDurationLabel(fs.history);

              return (
                <div key={item.hrd_id} className={styles.subCard}>
                  <div className={styles.subHeader}>
                    <div className={styles.subIdRow}>
                      <span className={styles.subTicketNo}>{item.detail_ticket_no}</span>
                      <span className={`${styles.statusPill} ${styles.statusPillPrimary}`}>
                        {item.current_status}
                      </span>
                    </div>
                    <button type="button" className={styles.detailBtn} onClick={() => openDetail(item)}>
                      查看詳情
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>

                  <div className={styles.metaLine}>開始時間：{fmt(item.created_at)}</div>

                  <div className={styles.metricRow}>
                    <div className={styles.metricTile}>
                      <span className={styles.metricLabel}>維修時長</span>
                      <span className={styles.metricValue}>
                        <i className="far fa-clock" aria-hidden />
                        {durationLabel}
                      </span>
                    </div>
                    <div className={styles.metricTile}>
                      <span className={styles.metricLabel}>目前處理者</span>
                      <span className={styles.metricValue}>
                        <i className="fas fa-user" aria-hidden />
                        {fmt(item.current_process_name)}
                        {item.current_process_nt ? `（${item.current_process_nt}）` : ''}
                      </span>
                    </div>
                    <div className={styles.metricTile}>
                      <span className={styles.metricLabel}>完成度</span>
                      <span className={styles.metricPct}>{pct}%</span>
                    </div>
                  </div>

                  <div
                    className={styles.progressBarOnly}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`完成度 ${pct}%`}
                  >
                    <div className={styles.progressBarTrack}>
                      <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default HWMAREPAIREDBYCASE;
