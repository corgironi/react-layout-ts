// @ts-nocheck
import { useState, useEffect } from 'react';
import styles from './Daily.module.css';
import Table from '../../components/Table';
import Alert from '../../components/Alert';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useLeaveStore } from '../../store/leaveStore';
import { useSystemConfigStore } from '../../store/systemconfigStore';
import { getUserGroup } from '../../api/api';

// 每日考勤記錄
interface DailyRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'normal' | 'late' | 'early' | 'absent';
  note?: string;
}

const Daily = () => {
  const { 
    attendanceRecords, 
    engineers, 
    fetchAttendanceData, 
    batchCheckIn, 
    batchCancelCheckIn,
    siteCheckReports,
    fetchSiteCheckReport,
    isLoading,
    error
  } = useAttendanceStore();
  const { leaveRecords } = useLeaveStore();
  const { usergroup, setUserGroup } = useSystemConfigStore();
  
  // 使用當地時區格式化日期
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const today = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedArea, setSelectedArea] = useState<number | ''>('');
  const [selectedEids, setSelectedEids] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Alert 相關狀態
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning' as const
  });

  // 每日考勤記錄列表
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date());

  // 獲取考勤記錄
  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = format(date, 'yyyy-MM-dd');
      const endDate = format(date, 'yyyy-MM-dd');
      const response = await attendanceAPI.getRecords(startDate, endDate);
      setRecords(response);
    } catch (error) {
      setError('獲取考勤記錄失敗');
    } finally {
      setLoading(false);
    }
  };

  // 更新考勤記錄
  const updateRecord = async (id: string, record: Partial<DailyRecord>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await attendanceAPI.updateRecord(id, record);
      setRecords(records.map(r => r.id === id ? response : r));
    } catch (error) {
      setError('更新考勤記錄失敗');
    } finally {
      setLoading(false);
    }
  };

  // 刪除考勤記錄
  const deleteRecord = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await attendanceAPI.deleteRecord(id);
      setRecords(records.filter(r => r.id !== id));
    } catch (error) {
      setError('刪除考勤記錄失敗');
    } finally {
      setLoading(false);
    }
  };

  // 獲取用戶群組配置
  useEffect(() => {
    const fetchUserGroupConfig = async () => {
      try {
        const userGroupData = await getUserGroup();
        setUserGroup(userGroupData);
      } catch (error) {
        console.error('Error fetching user group config:', error);
      }
    };
    
    fetchUserGroupConfig();
  }, [setUserGroup]);

  // 獲取 API 出勤數據
  useEffect(() => {
    try {
      // 如果有選擇區域，則傳遞 auid 參數
      if (selectedArea !== '') {
        fetchSiteCheckReport(selectedDate, selectedArea);
      } else {
        fetchSiteCheckReport(selectedDate);
      }
    } catch (error) {
      console.error('Error fetching daily report:', error);
    }
  }, [selectedDate, selectedArea]);

  // 在 Daily.tsx 中添加一個 useEffect 來檢查 API 返回的數據
  useEffect(() => {
    console.log('API 返回的數據:', siteCheckReports);
    console.log('本地出勤記錄:', attendanceRecords);
  }, [siteCheckReports, attendanceRecords]);

  // 檢查是否為過去日期
  const isPastDate = (date: string) => {
    const selectedDateObj = new Date(date);
    const todayObj = new Date();
    
    // 設置時間為 00:00:00 以便只比較日期
    selectedDateObj.setHours(0, 0, 0, 0);
    todayObj.setHours(0, 0, 0, 0);
    
    return selectedDateObj < todayObj;
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEids([]);
    } else {
      // 只選擇非請假的員工
      const availableEids = filteredData
        .filter(record => record.status !== 'Leave')
        .map(record => record.eid);
      setSelectedEids(availableEids);
    }
    setSelectAll(!selectAll);
  };

  const handleSelect = (eid: string, status: string) => {
    // 如果是請假狀態，不允許選擇
    if (status === 'Leave') return;
    
    if (selectedEids.includes(eid)) {
      setSelectedEids(selectedEids.filter(id => id !== eid));
    } else {
      setSelectedEids([...selectedEids, eid]);
    }
  };

  // 執行打卡操作
  const executeBatchCheckIn = async () => {
    if (selectedEids.length > 0) {
      try {
        await batchCheckIn(selectedEids);
        setSelectedEids([]);
        setSelectAll(false);
      } catch (error) {
        console.error('批次打卡失敗:', error);
      }
    }
  };

  // 執行取消打卡操作
  const executeBatchCancelCheckIn = async () => {
    if (selectedEids.length > 0) {
      try {
        await batchCancelCheckIn(selectedEids);
        setSelectedEids([]);
        setSelectAll(false);
      } catch (error) {
        console.error('批次取消打卡失敗:', error);
      }
    }
  };

  const handleBatchCheckIn = async () => {
    if (selectedEids.length === 0) return;

    // 檢查是否為過去日期
    if (isPastDate(selectedDate)) {
      setAlertConfig({
        isOpen: true,
        title: '補打卡確認',
        message: `您選擇的日期 ${selectedDate} 是過去的日期，您是否要進行補打卡？`,
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          executeBatchCheckIn();
        },
        type: 'warning'
      });
    } else {
      // 當天或未來日期，直接執行
      await executeBatchCheckIn();
    }
  };

  const handleBatchCancelCheckIn = async () => {
    if (selectedEids.length === 0) return;

    // 檢查是否為過去日期
    if (isPastDate(selectedDate)) {
      setAlertConfig({
        isOpen: true,
        title: '取消打卡確認',
        message: `您選擇的日期 ${selectedDate} 是過去的日期，您是否要取消該日期的打卡記錄？`,
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, isOpen: false }));
          executeBatchCancelCheckIn();
        },
        type: 'warning'
      });
    } else {
      // 當天或未來日期，直接執行
      await executeBatchCancelCheckIn();
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedEids([]);
    setSelectAll(false);
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedArea(value === '' ? '' : parseInt(value));
    setSelectedEids([]);
    setSelectAll(false);
  };

  // 獲取代理人名稱
  const getProxyName = (proxyAccount: string | null) => {
    if (!proxyAccount) return '';
    const proxy = engineers.find(eng => eng.account === proxyAccount);
    return proxy ? proxy.name : proxyAccount; // 如果找不到代理人，直接顯示帳號
  };

  // 直接使用 API 返回的數據創建表格數據
  const apiTableData = siteCheckReports.map(apiRecord => {
    // 查找對應的本地記錄
    const localRecord = attendanceRecords.find(record => 
      record.account === apiRecord.useraccount
    );
    
    // 查找工程師資料
    const engineer = engineers.find(eng => eng.account === apiRecord.useraccount);
    
    // 將 API 狀態轉換為本地狀態
    let status: 'Checked-in' | 'Pending' | 'Leave' = 'Pending';
    if (apiRecord.status === 'checkin') {
      status = 'Checked-in';
    } else if (localRecord?.status === 'Leave') {
      status = 'Leave';
    }
    
    return {
      eid: apiRecord.useraccount, // 使用 useraccount 作為員工編號
      account: apiRecord.useraccount,
      name: apiRecord.useraccount, // 使用 useraccount 作為名稱，因為 API 沒有返回 username
      department: engineer?.department || '',
      site: apiRecord.site,
      tel: apiRecord.telephone || '',
      status,
      time: apiRecord.checktime || '',
      agent: apiRecord.delegate,
      date: apiRecord.updatedate
    };
  });

  // 合併 API 數據和本地數據
  const mergedData = [
    ...apiTableData,
    ...attendanceRecords.filter(record => 
      !siteCheckReports.some(api => api.useraccount === record.account)
    )
  ];

  // 使用合併後的數據進行過濾
  const filteredData = mergedData.filter(record => {
    if (!searchKeyword) return true;
    
    const keyword = searchKeyword.toLowerCase();
    return (
      (record.name || '').toLowerCase().includes(keyword) ||
      (record.account || '').toLowerCase().includes(keyword) ||
      (record.department || '').toLowerCase().includes(keyword) ||
      (record.tel || '').toLowerCase().includes(keyword)
    );
  });

  // 表格列定義
  const columns = [
    { 
      title: '選擇', 
      key: 'select',
      render: (record: any) => (
        <input 
          type="checkbox" 
          checked={selectedEids.includes(record.eid)}
          onChange={() => handleSelect(record.eid, record.status)}
          disabled={record.status === 'Leave'}
        />
      )
    },
    { 
      title: '帳號',
      key: 'eid' 
    },
    { 
      title: '姓名', 
      key: 'name',
      render: (record: any) => record.name || '-'
    },
    { 
      title: '部門', 
      key: 'department',
      render: (record: any) => record.department || '-'
    },
    {
      title: '電話',
      key: 'tel',
      render: (record: any) => record.tel || '-'
    },
    { 
      title: '狀態', 
      key: 'status',
      render: (record: any) => {
        let statusText = '';
        let statusClass = '';
        
        switch(record.status) {
          case 'Checked-in':
            statusText = '已簽到';
            statusClass = styles.checkedIn;
            break;
          case 'Pending':
            statusText = '尚未簽到';
            statusClass = styles.pending;
            break;
          case 'Leave':
            statusText = '請假';
            statusClass = styles.leave;
            break;
          default:
            statusText = '未知';
            statusClass = '';
        }
        
        return (
          <span className={`${styles.status} ${statusClass}`}>
            {statusText}
          </span>
        );
      }
    },
    { 
      title: '簽到時間', 
      key: 'time',
      render: (record: any) => record.time || '-'
    },
    { 
      title: '代理人', 
      key: 'agent',
      render: (record: any) => {
        if (record.status !== 'Leave') return '-';
        return record.agent ? getProxyName(record.agent) : '-';
      }
    }
  ];

  return (
    <div className={styles.container}>
      {/* Alert 組件 */}
      <Alert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        type={alertConfig.type}
        confirmText="確認"
        cancelText="取消"
      />

      {/* 頂部操作區 */}
      <div className={styles.actionBar}>
        <div className={styles.leftActions}>
          <div className={styles.dateFilter}>
            <label>選擇日期：</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={handleDateChange}
              className={styles.dateInput}
            />
            {isPastDate(selectedDate) && (
              <span className={styles.pastDateWarning}>
                ⚠️ 過去日期
              </span>
            )}
          </div>
          <div className={styles.areaFilter}>
            <label>選擇區域：</label>
            <select 
              value={selectedArea}
              onChange={handleAreaChange}
              className={styles.areaSelect}
            >
              <option value="">全部區域</option>
              {usergroup.map((group) => (
                <option key={group.auid} value={group.auid}>
                  {group.sitearea}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.searchBar}>
            <input 
              type="text" 
              placeholder="搜尋員工..."
              className={styles.searchInput}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.rightActions}>
          <button 
            className={styles.actionButton}
            onClick={handleSelectAll}
          >
            {selectAll ? '取消全選' : '全選'}
          </button>
          <button 
            className={styles.actionButton}
            onClick={handleBatchCheckIn}
            disabled={selectedEids.length === 0}
          >
            {isPastDate(selectedDate) ? '補打卡' : '一鍵打卡'}
          </button>
          <button 
            className={`${styles.actionButton} ${styles.cancelButton}`}
            onClick={handleBatchCancelCheckIn}
            disabled={selectedEids.length === 0}
          >
            取消打卡
          </button>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* 統計資訊 */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>總人數</span>
          <span className={styles.statValue}>{filteredData.length}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>已簽到</span>
          <span className={styles.statValue}>
            {filteredData.filter(r => r.status === 'Checked-in').length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>未簽到</span>
          <span className={styles.statValue}>
            {filteredData.filter(r => r.status === 'Pending').length}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>請假</span>
          <span className={styles.statValue}>
            {filteredData.filter(r => r.status === 'Leave').length}
          </span>
        </div>
      </div>

      {/* 表格區域 */}
      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={styles.loading}>載入中...</div>
        ) : (
          <Table 
            columns={columns} 
            data={filteredData} 
          />
        )}
      </div>
    </div>
  );
};

export default Daily;
