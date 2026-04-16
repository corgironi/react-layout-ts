import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import axios from 'axios';
import styles from './HWMAREPAIREDBYCASE.module.css';
import {
  hardwareMaintenanceAPI,
  HWMAMaintenanceByCaseResponse,
  HWMAMaintenanceDetailItem,
  HWMAMaintenanceSubStep,
} from '../../api/api';

const fmt = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string' && v.trim() === '') return 'null';
  return String(v);
};

const parseApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string') {
      return (data as { message: string }).message;
    }
    return error.message || '載入失敗';
  }
  return '載入失敗';
};

function subitemProgress(subitems: HWMAMaintenanceSubStep[]) {
  const list = subitems ?? [];
  const total = list.length;
  const completed = list.filter((s) => s.status === 'completed').length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pct };
}

const HWMAREPAIREDBYCASE = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const caseid = searchParams.get('caseid')?.trim() ?? '';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<HWMAMaintenanceByCaseResponse | null>(null);

  const load = useCallback(async () => {
    if (!caseid) return;
    setLoading(true);
    setError('');
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

  const openDetail = (item: HWMAMaintenanceDetailItem) => {
    navigate(`/hardware-maintenance/${item.hrd_id}`);
  };

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
            母單編號：{data?.parent_ticket?.issued_no ?? caseid}
          </p>
        </div>
        {data && (
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>子單總數</div>
            <div className={styles.summaryValue}>{data.total_count}</div>
          </div>
        )}
      </div>

      {loading && <div className={`${styles.stateBox} ${styles.stateLoading}`}>載入中…</div>}
      {!loading && error && (
        <div className={`${styles.stateBox} ${styles.stateError}`} role="alert">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className={styles.parentCard}>
            <div className={styles.parentGrid}>
              <div className={styles.parentField}>
                <span className={styles.parentLabel}>報案者（NT）</span>
                <span className={styles.parentValue}>{fmt(data.parent_ticket.reporter_nt_account)}</span>
              </div>
              <div className={styles.parentField}>
                <span className={styles.parentLabel}>員工工號</span>
                <span className={styles.parentValue}>{fmt(data.parent_ticket.reporter_employee_id)}</span>
              </div>
              <div className={styles.parentField}>
                <span className={styles.parentLabel}>地點</span>
                <span className={styles.parentValue}>
                  {[data.parent_ticket.issued_site, data.parent_ticket.issued_site_phase]
                    .filter(Boolean)
                    .join(' ') || 'null'}
                </span>
              </div>
              <div className={styles.parentField}>
                <span className={styles.parentLabel}>設備</span>
                <span className={styles.parentValue}>{fmt(data.parent_ticket.device_name)}</span>
              </div>
              <div className={styles.parentField}>
                <span className={styles.parentLabel}>借用設備</span>
                <span className={styles.parentValue}>{fmt(data.parent_ticket.borrow_device_name)}</span>
              </div>
            </div>
            <div className={styles.issueRow}>
              <span className={styles.parentLabel}>問題描述</span>
              <p className={styles.parentValue} style={{ margin: '0.35rem 0 0' }}>
                {fmt(data.parent_ticket.issue_description)}
              </p>
            </div>
          </div>

          <h2 className={styles.sectionTitle}>維修子單列表</h2>
          <div className={styles.subList}>
            {data.items.length === 0 && <p className={styles.stateMuted}>尚無子單資料</p>}
            {data.items.map((item) => {
              const { total, completed, pct } = subitemProgress(item.subitems);
              return (
                <div key={item.hrd_id} className={styles.subCard}>
                  <div className={styles.subHeader}>
                    <div className={styles.subIdRow}>
                      <span className={styles.subTicketNo}>{item.detail_ticket_no}</span>
                      <span className={styles.statusPill}>{item.current_status}</span>
                    </div>
                    <button type="button" className={styles.detailBtn} onClick={() => openDetail(item)}>
                      查看詳情
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>
                  <div className={styles.metaLine}>
                    開始時間：{fmt(item.created_at)}
                  </div>
                  <div className={styles.subGrid}>
                    <div className={styles.subGridItem}>
                      <span className={styles.subGridLabel}>維修時長</span>
                      <span className={styles.subGridValue}>
                        <i className="far fa-clock" />
                        —
                      </span>
                    </div>
                    <div className={styles.subGridItem}>
                      <span className={styles.subGridLabel}>目前處理者</span>
                      <span className={styles.subGridValue}>
                        <i className="fas fa-user" />
                        {fmt(item.current_process_name)}
                        {item.current_process_nt ? `（${item.current_process_nt}）` : ''}
                      </span>
                    </div>
                    <div className={styles.subGridItem}>
                      <span className={styles.subGridLabel}>進度</span>
                      <span className={styles.subGridValue}>
                        {completed} / {total} 步驟
                      </span>
                    </div>
                  </div>
                  <div className={styles.progressFooter}>
                    <div className={styles.progressLabels}>
                      <span>完成度</span>
                      <span>{pct}%</span>
                    </div>
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
