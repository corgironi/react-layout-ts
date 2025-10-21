// @ts-nocheck
import { useState, useEffect } from 'react';
import styles from './Leave.module.css';
import Table from '../../components/Table';
import Alert from '../../components/Alert';
import { useLeaveStore, type LeaveRequest } from '../../store/leaveStore';

const Leave = () => {
  const { 
    leaveRecords, 
    colleagues,
    isLoading, 
    isLoadingColleagues,
    isSubmitting,
    cancelLeave,
    fetchColleagues,
    submitLeave,
    fetchLeaveRecords
  } = useLeaveStore();
  
  const [showModal, setShowModal] = useState(false);
  
  // Alert 相關狀態
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
    type: 'info' as 'info' | 'warning' | 'error' | 'success'
  });
  
  // 格式化日期為 YYYY-MM-DD
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  const today = formatDate(new Date());
  
  // 日期範圍狀態
  const [dateRange, setDateRange] = useState({
    startDate: today,
    endDate: today
  });
  
  const [formData, setFormData] = useState({
    account: '',
    startDateTime: '',
    endDateTime: '',
    reason: '',
    proxy: ''
  });

  // 初始載入當天資料
  useEffect(() => {
    fetchLeaveRecords(today, today);
  }, []);

  // 處理日期範圍查詢
  const handleDateRangeSearch = async () => {
    if (dateRange.startDate > dateRange.endDate) {
      setAlertConfig({
        isOpen: true,
        title: '日期錯誤',
        message: '開始日期不能晚於結束日期',
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        type: 'info'
      });
      return;
    }
    
    try {
      await fetchLeaveRecords(dateRange.startDate, dateRange.endDate);
    } catch (error) {
      console.error('查詢請假記錄失敗:', error);
    }
  };

  // 處理打開新增請假彈窗
  const handleOpenModal = async () => {
    setShowModal(true);
    // 重置表單
    setFormData({
      account: '',
      startDateTime: '',
      endDateTime: '',
      reason: '',
      proxy: ''
    });
    // 獲取同事資料
    await fetchColleagues();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account || !formData.startDateTime || !formData.endDateTime || !formData.reason) {
      setAlertConfig({
        isOpen: true,
        title: '表單驗證',
        message: '請填寫所有必填欄位',
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        type: 'info'
      });
      return;
    }

    try {
      await submitLeave(formData);
      setAlertConfig({
        isOpen: true,
        title: '成功',
        message: '請假申請已提交成功',
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          setShowModal(false);
          // 重新載入請假記錄
          fetchLeaveRecords(dateRange.startDate, dateRange.endDate);
        },
        onCancel: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        type: 'success'
      });
    } catch (error) {
      console.error('提交請假申請失敗:', error);
      setAlertConfig({
        isOpen: true,
        title: '錯誤',
        message: error instanceof Error ? error.message : '提交請假申請失敗',
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        type: 'error'
      });
    }
  };

  const handleDelete = (id: number, accountName: string) => {
    // 檢查參數是否有效
    if (!id || typeof id !== 'number') {
      console.error('無效的 ID:', id);
      setAlertConfig({
        isOpen: true,
        title: '錯誤',
        message: '無效的請假記錄 ID',
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        type: 'error'
      });
      return;
    }

    setAlertConfig({
      isOpen: true,
      title: '確認取消請假',
      message: `確定要取消 ${accountName || '該員工'} 的請假申請嗎？`,
      onConfirm: async () => {
        try {
          await cancelLeave(id);
          setAlertConfig({
            isOpen: true,
            title: '成功',
            message: '請假申請已成功取消',
            onConfirm: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
              // 重新載入請假記錄
              fetchLeaveRecords(dateRange.startDate, dateRange.endDate);
            },
            onCancel: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
            },
            type: 'success'
          });
        } catch (error) {
          console.error('取消請假失敗:', error);
          setAlertConfig({
            isOpen: true,
            title: '錯誤',
            message: error instanceof Error ? error.message : '取消請假失敗',
            onConfirm: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
            },
            type: 'error'
          });
        }
      },
      onCancel: () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      },
      type: 'info'
    });
  };

  const columns = [
    { key: 'id', title: 'ID' },
    { key: 'account', title: '員工帳號' },
    { key: 'accountName', title: '員工姓名' },
    { key: 'startDateTime', title: '開始時間' },
    { key: 'endDateTime', title: '結束時間' },
    { key: 'reason', title: '請假原因' },
    { key: 'proxyaccount', title: '代理人帳號' },
    { key: 'proxyName', title: '代理人姓名' },
    {
      key: 'actions',
      title: '操作',
      render: (record: any) => {
        // 檢查 record 是否有效
        if (!record || typeof record.id === 'undefined') {
          console.error('無效的記錄:', record);
          return (
            <span className={styles.errorText}>無效記錄</span>
          );
        }

        return (
          <button
            onClick={() => handleDelete(record.id, record.accountName || record.account)}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            {isLoading ? '處理中...' : '取消請假'}
          </button>
        );
      }
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>請假管理</h2>
      </div>
      
      <div className={styles.actionBar}>
        <div className={styles.leftActions}>
          <div className={styles.dateRangeFilter}>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className={styles.dateInput}
            />
            <span>到</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className={styles.dateInput}
            />
            <button 
              onClick={handleDateRangeSearch}
              className={styles.searchButton}
              disabled={isLoading}
            >
              {isLoading ? '查詢中...' : '查詢'}
            </button>
          </div>
        </div>
        
        <div className={styles.rightActions}>
          <button
            onClick={handleOpenModal}
            className={styles.addButton}
            disabled={isLoadingColleagues}
          >
            新增請假
          </button>
        </div>
      </div>

      {/* 統計資訊 */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>總請假數:</span>
          <span className={styles.statValue}>{leaveRecords.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>查詢範圍:</span>
          <span className={styles.statValue}>{dateRange.startDate} ~ {dateRange.endDate}</span>
        </div>
      </div>

      {/* 請假記錄表格 */}
      <div className={styles.tableWrapper}>
        <Table 
          data={leaveRecords} 
          columns={columns}
        />
      </div>

      {/* Alert 組件 */}
      <Alert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        type={alertConfig.type}
      />

      {/* 新增請假彈窗 */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>新增請假</h3>
              <button
                onClick={() => setShowModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>員工帳號 *</label>
                  <select
                    value={formData.account}
                    onChange={(e) => setFormData(prev => ({ ...prev, account: e.target.value }))}
                    className={styles.select}
                    required
                    disabled={isLoadingColleagues}
                  >
                    <option value="">
                      {isLoadingColleagues ? '載入中...' : '請選擇員工'}
                    </option>
                    {colleagues && colleagues.map(colleague => (
                      <option key={colleague.useraccount} value={colleague.useraccount}>
                        {colleague.username}({colleague.useraccount})
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>代理人</label>
                  <select
                    value={formData.proxy}
                    onChange={(e) => setFormData(prev => ({ ...prev, proxy: e.target.value }))}
                    className={styles.select}
                    disabled={isLoadingColleagues}
                  >
                    <option value="">
                      {isLoadingColleagues ? '載入中...' : '請選擇代理人（可選）'}
                    </option>
                    {colleagues && colleagues.map(colleague => (
                      <option key={colleague.useraccount} value={colleague.useraccount}>
                        {colleague.username}({colleague.useraccount})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>開始時間 *</label>
                  <input
                    type="datetime-local"
                    value={formData.startDateTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDateTime: e.target.value }))}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>結束時間 *</label>
                  <input
                    type="datetime-local"
                    value={formData.endDateTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDateTime: e.target.value }))}
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>請假原因 *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  className={styles.textarea}
                  placeholder="請輸入請假原因"
                  required
                />
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={styles.cancelBtn}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={isSubmitting || isLoadingColleagues}
                >
                  {isSubmitting ? '提交中...' : '提交'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leave; 