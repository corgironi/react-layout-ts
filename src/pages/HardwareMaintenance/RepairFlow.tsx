import { useParams } from 'react-router';
import styles from './RepairFlow.module.css';
import StepFlow, { StepFlowStep } from '../../components/StepFlow';

const RepairFlow = () => {
  const { rid } = useParams<{ rid: string }>();

  // 根據設計稿的範例資料
  const steps: StepFlowStep[] = [
    {
      id: 'step-1',
      title: '初步檢測',
      comment: '判定硬體故障',
      timestamp: '2024-10-20 11:30',
      responsible: 'IT-張明',
      status: 'completed',
    },
    {
      id: 'step-2',
      title: '廠商判定項目',
      comment: '需更換螢幕排線、記憶體升級',
      timestamp: '2024-10-21 12:30',
      responsible: '廠商-王工程師',
      status: 'completed',
    },
    {
      id: 'step-3',
      title: '費用及報價階段',
      comment: '請選擇付款方式',
      timestamp: '2024-10-22 13:30',
      responsible: '待選擇',
      status: 'active',
      actionButton: {
        label: '選擇付款方式',
        icon: 'fas fa-dollar-sign',
        onClick: () => {
          console.log('選擇付款方式');
          alert('選擇付款方式功能');
        },
        variant: 'primary',
      },
    },
    {
      id: 'step-4',
      title: '維修進行中',
      comment: '維修進行中',
      status: 'pending',
    },
  ];

  // 模擬從 API 獲取案件資訊（根據 RID）
  const caseInfo = {
    reportNumber: 'Case-2024-001',
    reporter: '張三',
    employeeId: '123456',
    location: '台中',
    equipment: 'Dell Latitude 5420',
    problemDescription: '電腦無法開機,疑似主機板故障',
  };

  const handleChangeNodeStatus = () => {
    console.log('改變節點狀態');
    alert('改變節點狀態功能');
  };

  const handleWaitingEquipment = () => {
    console.log('等待設備');
    alert('等待設備功能');
  };

  const handleCancelOrder = () => {
    console.log('棄單');
    if (window.confirm('確定要棄單嗎？')) {
      alert('棄單功能');
    }
  };

  return (
    <div className={styles.container}>
      {/* 頁面標題 */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <i className="fas fa-wrench"></i>
          <h1 className={styles.pageTitle}>維修單管理</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.ridLabel}>RID:</span>
          <span className={styles.ridValue}>{rid || 'RID-2026-0201-001'}</span>
        </div>
      </div>

      {/* 案件資訊卡片 */}
      <div className={styles.caseInfoCard}>
        <div className={styles.caseInfoHeader}>
          <span className={styles.caseNumberLabel}>母單單號</span>
          <span className={styles.caseNumber}>{caseInfo.reportNumber}</span>
        </div>
        <div className={styles.caseInfoGrid}>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>報案者</span>
            <span className={styles.caseInfoValue}>
              {caseInfo.reporter} ({caseInfo.employeeId})
            </span>
          </div>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>地點</span>
            <span className={styles.caseInfoValue}>{caseInfo.location}</span>
          </div>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>設備</span>
            <span className={styles.caseInfoValue}>{caseInfo.equipment}</span>
          </div>
          <div className={styles.caseInfoItem}>
            <span className={styles.caseInfoLabel}>問題描述</span>
            <span className={styles.caseInfoValue}>
              {caseInfo.problemDescription}
            </span>
          </div>
        </div>
      </div>

      {/* 操作按鈕區域 */}
      <div className={styles.actionButtons}>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
          onClick={handleChangeNodeStatus}
        >
          <i className="fas fa-check"></i>
          <span>改變節點狀態</span>
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnWarning}`}
          onClick={handleWaitingEquipment}
        >
          <i className="fas fa-clock"></i>
          <span>等待設備</span>
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
          onClick={handleCancelOrder}
        >
          <i className="fas fa-times"></i>
          <span>棄單 (Admin)</span>
        </button>
      </div>

      {/* 維修流程進度 */}
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
