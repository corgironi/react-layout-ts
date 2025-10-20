// @ts-nocheck
import { useState, useEffect } from 'react';
import styles from './Overtime.module.css';
import Table from '../../components/Table';
import Alert from '../../components/Alert';
import { getSameEmployers, overtimeAPI } from '../../api/api';

interface OvertimeRecord {
  id: number;
  account: string;
  accountName: string;
  startDateTime: string;
  endDateTime: string;
  reason: string;
}

interface Colleague {
  useraccount: string;
  username: string;
}

interface OvertimeFormData {
  selectedAccounts: string[];
  startDateTime: string;
  endDateTime: string;
  reason: string;
}

const Overtime = () => {
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingColleagues, setIsLoadingColleagues] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
  
  const [formData, setFormData] = useState<OvertimeFormData>({
    selectedAccounts: [],
    startDateTime: '',
    endDateTime: '',
    reason: ''
  });

  // 初始載入當天資料
  useEffect(() => {
    fetchOvertimeRecords(today, today);
  }, []);

  // 獲取加班記錄
  const fetchOvertimeRecords = async (startDate: string, endDate: string) => {
    setIsLoading(true);
    try {
      const data = await overtimeAPI.getOvertimeRecords(startDate, endDate);
      setOvertimeRecords(data);
    } catch (error) {
      console.error('查詢加班記錄失敗:', error);
      setAlertConfig({
        isOpen: true,
        title: '錯誤',
        message: '查詢加班記錄失敗',
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      await fetchOvertimeRecords(dateRange.startDate, dateRange.endDate);
    } catch (error) {
      console.error('查詢加班記錄失敗:', error);
    }
  };

  // 處理打開新增加班彈窗
  const handleOpenModal = async () => {
    setShowModal(true);
    // 重置表單
    setFormData({
      selectedAccounts: [],
      startDateTime: '',
      endDateTime: '',
      reason: ''
    });
    // 獲取同事資料
    await fetchColleagues();
  };

  // 獲取同事資料
  const fetchColleagues = async () => {
    setIsLoadingColleagues(true);
    try {
      const data = await getSameEmployers();
      setColleagues(data);
    } catch (error) {
      console.error('獲取同事資料失敗:', error);
      setAlertConfig({
        isOpen: true,
        title: '錯誤',
        message: '獲取同事資料失敗',
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        onCancel: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
        },
        type: 'error'
      });
    } finally {
      setIsLoadingColleagues(false);
    }
  };

  // 處理多選人員
  const handleAccountSelection = (account: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selectedAccounts: [...prev.selectedAccounts, account]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedAccounts: prev.selectedAccounts.filter(acc => acc !== account)
      }));
    }
  };

  // 提交加班申請
  const handleSubmit = async () => {
    if (formData.selectedAccounts.length === 0) {
      setAlertConfig({
        isOpen: true,
        title: '表單驗證',
        message: '請選擇至少一名員工',
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

    if (!formData.startDateTime || !formData.endDateTime || !formData.reason) {
      setAlertConfig({
        isOpen: true,
        title: '表單驗證',
        message: '請填寫開始時間、結束時間和加班原因',
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

    // 顯示確認對話框
    const selectedNames = formData.selectedAccounts.map(account => {
      const colleague = colleagues.find(c => c.useraccount === account);
      return colleague ? `${colleague.username}(${account})` : account;
    }).join('、');

    setAlertConfig({
      isOpen: true,
      title: '確認送出加班申請',
      message: `確定要為以下員工送出加班申請嗎？\n\n員工：${selectedNames}\n開始時間：${formData.startDateTime}\n結束時間：${formData.endDateTime}\n加班原因：${formData.reason}`,
      onConfirm: async () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
        
        setIsSubmitting(true);
        try {
          // 格式化日期時間為 YYYY-MM-DD HH:mm 格式
          const formatDateTime = (dateTimeString: string) => {
            const date = new Date(dateTimeString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}`;
          };

          await overtimeAPI.setOvertime({
            accounts: formData.selectedAccounts,
            startdate: formatDateTime(formData.startDateTime),
            enddate: formatDateTime(formData.endDateTime),
            reason: formData.reason
          });

          setAlertConfig({
            isOpen: true,
            title: '成功',
            message: '加班申請已提交成功',
            onConfirm: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
              setShowModal(false);
              // 重新載入加班記錄
              fetchOvertimeRecords(dateRange.startDate, dateRange.endDate);
            },
            onCancel: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
            },
            type: 'success'
          });
        } catch (error) {
          console.error('提交加班申請失敗:', error);
          setAlertConfig({
            isOpen: true,
            title: '錯誤',
            message: error instanceof Error ? error.message : '提交加班申請失敗',
            onConfirm: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
            },
            type: 'error'
          });
        } finally {
          setIsSubmitting(false);
        }
      },
      onCancel: () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      },
      type: 'info'
    });
  };

  // 取消加班
  const handleCancelOvertime = (id: number, accountName: string) => {
    if (!id || typeof id !== 'number') {
      console.error('無效的 ID:', id);
      setAlertConfig({
        isOpen: true,
        title: '錯誤',
        message: '無效的加班記錄 ID',
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
      title: '確認取消加班',
      message: `確定要取消 ${accountName || '該員工'} 的加班申請嗎？`,
      onConfirm: async () => {
        try {
          await overtimeAPI.deleteOvertime(id);
          
          setAlertConfig({
            isOpen: true,
            title: '成功',
            message: '加班申請已成功取消',
            onConfirm: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
              // 重新載入加班記錄
              fetchOvertimeRecords(dateRange.startDate, dateRange.endDate);
            },
            onCancel: () => {
              setAlertConfig(prev => ({ ...prev, isOpen: false }));
            },
            type: 'success'
          });
        } catch (error) {
          console.error('取消加班失敗:', error);
          setAlertConfig({
            isOpen: true,
            title: '錯誤',
            message: error instanceof Error ? error.message : '取消加班失敗',
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
    { key: 'reason', title: '加班原因' },
    {
      key: 'actions',
      title: '操作',
      render: (record: any) => {
        if (!record || typeof record.id === 'undefined') {
          console.error('無效的記錄:', record);
          return (
            <span className={styles.errorText}>無效記錄</span>
          );
        }

        return (
          <button
            onClick={() => handleCancelOvertime(record.id, record.accountName || record.account)}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            {isLoading ? '處理中...' : '取消加班'}
          </button>
        );
      }
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>加班管理</h2>
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
            新增加班
          </button>
        </div>
      </div>

      {/* 統計資訊 */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>總加班數:</span>
          <span className={styles.statValue}>{overtimeRecords.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>查詢範圍:</span>
          <span className={styles.statValue}>{dateRange.startDate} ~ {dateRange.endDate}</span>
        </div>
      </div>

      {/* 加班記錄表格 */}
      <div className={styles.tableWrapper}>
        <Table 
          data={overtimeRecords} 
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

      {/* 新增加班彈窗 */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>新增加班</h3>
              <button
                onClick={() => setShowModal(false)}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            
            <div className={styles.form}>
              {/* 人員選擇區域 */}
              <div className={styles.formSection}>
                <h4>選擇員工 (可多選)</h4>
                <div className={styles.employeeGrid}>
                  {colleagues.map(colleague => (
                    <label key={colleague.useraccount} className={styles.employeeCheckbox}>
                      <input
                        type="checkbox"
                        checked={formData.selectedAccounts.includes(colleague.useraccount)}
                        onChange={(e) => handleAccountSelection(colleague.useraccount, e.target.checked)}
                        disabled={isLoadingColleagues}
                      />
                      <span className={styles.checkboxLabel}>
                        {colleague.username}({colleague.useraccount})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 批次設定區域 */}
              <div className={styles.formSection}>
                <h4>批次設定</h4>
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
                  <label>加班原因 *</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className={styles.textarea}
                    placeholder="請輸入加班原因"
                    required
                  />
                </div>
              </div>

              {/* 提交按鈕 */}
              <div className={styles.submitSection}>
                <button
                  onClick={handleSubmit}
                  className={styles.submitBtn}
                  disabled={isSubmitting || formData.selectedAccounts.length === 0 || !formData.startDateTime || !formData.endDateTime || !formData.reason}
                >
                  {isSubmitting ? '提交中...' : '送出加班申請'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overtime; 