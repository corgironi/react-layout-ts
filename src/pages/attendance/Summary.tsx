import { useState, useEffect } from 'react';
import styles from './Summary.module.css';

// 假資料類型定義
interface SiteCheckData {
  username: string;
  site: string; // 站點位置
  date: string;
  status: 'checkin' | 'pending' | 'leave' | 'holiday';
  leaveType?: 'personal leave' | 'sick leave'; // 請假類型
  phone?: string; // 電話號碼
  department?: string; // 部門
}

// 員工詳細資訊彈窗資料
interface EmployeeDetail {
  username: string;
  phone: string;
  department: string;
  date: string;
  status: string;
  leaveType?: string;
}

const Summary = () => {
  const [selectedSite, setSelectedSite] = useState('新竹');
  const [timeRangeType, setTimeRangeType] = useState<'month' | 'range'>('range');
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(7);
  const [startDate, setStartDate] = useState('2025/07/01');
  const [endDate, setEndDate] = useState('2025/07/23');
  const [heatmapData, setHeatmapData] = useState<SiteCheckData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // 生成假資料 (重新啟用用於測試)
  const generateMockData = (): SiteCheckData[] => {
    const users = [
      { name: 'User001', phone: '0901-234-567', department: 'IT部門', site: '新竹' },
      { name: 'User002', phone: '0902-345-678', department: 'HR部門', site: '台中' },
      { name: 'User003', phone: '0903-456-789', department: '財務部', site: '高雄' },
      { name: 'User004', phone: '0904-567-890', department: '營運部', site: '新竹' },
      { name: 'User005', phone: '0905-678-901', department: '行銷部', site: '台中' },
      { name: 'User006', phone: '0906-789-012', department: '研發部', site: '高雄' },
      { name: 'User007', phone: '0907-890-123', department: '客服部', site: '新竹' }
    ];
    
    // 生成 7/1 到 7/23 的日期
    const generateDates = (): string[] => {
      const dates: string[] = [];
      for (let day = 1; day <= 23; day++) {
        const dateStr = `2025-07-${String(day).padStart(2, '0')}`;
        dates.push(dateStr);
      }
      return dates;
    };
    
    const dates = generateDates();
    const statuses: ('checkin' | 'pending' | 'leave' | 'holiday')[] = ['checkin', 'pending', 'leave', 'holiday'];
    const leaveTypes: ('personal leave' | 'sick leave')[] = ['personal leave', 'sick leave'];
    
    const mockData: SiteCheckData[] = [];
    
    users.forEach(user => {
      dates.forEach(date => {
        // 隨機生成狀態，但確保有各種狀態的展示
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        const leaveType = randomStatus === 'leave' 
          ? leaveTypes[Math.floor(Math.random() * leaveTypes.length)]
          : undefined;
        
        mockData.push({
          username: user.name,
          site: user.site,
          date,
          status: randomStatus,
          leaveType,
          phone: user.phone,
          department: user.department
        });
      });
    });
    
    return mockData;
  };

  // 生成月份的開始和結束日期
  const getMonthRange = (year: number, month: number): { startDate: string, endDate: string } => {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // 獲取該月的最後一天
    
    const formatDate = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    return {
      startDate: formatDate(start),
      endDate: formatDate(end)
    };
  };

  // 處理站點選擇變更
  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSite(e.target.value);
  };

  // 處理時間範圍類型變更
  const handleTimeRangeTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeRangeType(e.target.value as 'month' | 'range');
  };

  // 處理年份變更
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedYear(parseInt(e.target.value));
  };

  // 處理月份變更
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  // 處理開始日期變更
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
  };

  // 處理結束日期變更
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
  };

  // 處理查詢按鈕點擊
  const handleSearch = async () => {
    setIsLoading(true);
    try {
      console.log('使用 Mock Data 進行測試');
      // 模擬 API 調用延遲
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 生成假資料
      const mockData = generateMockData();
      setHeatmapData(mockData);
    } catch (error) {
      console.error('查詢失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 處理員工點擊
  const handleEmployeeClick = (employee: SiteCheckData) => {
    setSelectedEmployee({
      username: employee.username,
      phone: employee.phone || '',
      department: employee.department || '',
      date: employee.date,
      status: employee.status,
      leaveType: employee.leaveType
    });
    setShowEmployeeModal(true);
  };

  // 關閉員工詳情彈窗
  const closeEmployeeModal = () => {
    setShowEmployeeModal(false);
    setSelectedEmployee(null);
  };

  // 初始化時生成假資料
  useEffect(() => {
    const mockData = generateMockData();
    setHeatmapData(mockData);
  }, []);

  // 當時間範圍類型變更時，更新日期
  useEffect(() => {
    if (timeRangeType === 'month') {
      const { startDate: monthStart, endDate: monthEnd } = getMonthRange(selectedYear, selectedMonth);
      setStartDate(monthStart);
      setEndDate(monthEnd);
    }
  }, [timeRangeType, selectedYear, selectedMonth]);

  return (
    <div className={styles.container}>
      {/* 查詢區域 */}
      <div className={styles.querySection}>
        <div className={styles.queryRow}>
          <div className={styles.formGroup}>
            <label>站點</label>
            <select 
              className={styles.select}
              value={selectedSite}
              onChange={handleSiteChange}
            >
              <option value="新竹">新竹</option>
              <option value="台中">台中</option>
              <option value="高雄">高雄</option>
            </select>
          </div>
          
          <div className={styles.formGroup}>
            <label>時間範圍</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="timeRangeType"
                  value="month"
                  checked={timeRangeType === 'month'}
                  onChange={handleTimeRangeTypeChange}
                />
                年月
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="timeRangeType"
                  value="range"
                  checked={timeRangeType === 'range'}
                  onChange={handleTimeRangeTypeChange}
                />
                日期區間
              </label>
            </div>
          </div>
        </div>
        
        <div className={styles.queryRow}>
          {timeRangeType === 'month' ? (
            <>
              <div className={styles.formGroup}>
                <label>年份</label>
                <input
                  type="number"
                  min="2020"
                  max="2030"
                  value={selectedYear}
                  onChange={handleYearChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>月份</label>
                <select
                  className={styles.select}
                  value={selectedMonth}
                  onChange={handleMonthChange}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {month}月
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className={styles.formGroup}>
                <label>開始日期</label>
                <input
                  type="text"
                  placeholder="2025/07/01"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>結束日期</label>
                <input
                  type="text"
                  placeholder="2025/07/23"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className={styles.input}
                />
              </div>
            </>
          )}
          
          <div className={styles.formGroup}>
            <button 
              className={styles.searchButton}
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? '查詢中...' : '查詢'}
            </button>
          </div>
        </div>
      </div>

      {/* 熱力圖區域 */}
      <div className={styles.heatmapSection}>
        {/* 圖例 */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.checkinLegend}`}></div>
            <span>已簽到 (checkin)</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.pendingLegend}`}></div>
            <span>未簽到 (pending)</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.leaveLegend}`}></div>
            <span>請假 (personal/sick leave)</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendColor} ${styles.holidayLegend}`}></div>
            <span>休假日 (holiday)</span>
          </div>
        </div>

        {/* 熱力圖容器 */}
        <div className={styles.heatmapWrapper}>
          <div className={styles.heatmapContainer}>
            {/* 熱力圖標題行 */}
            <div className={styles.heatmapHeader}>
              <div className={styles.siteHeader}>站點</div>
              <div className={styles.userNameHeader}>使用者</div>
              <div className={styles.datesHeader}>
                {Array.from({ length: 23 }, (_, i) => {
                  const date = new Date(2025, 6, i + 1);
                  return (
                    <div key={i} className={styles.dateCell}>
                      {`${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 熱力圖數據行 */}
            {heatmapData
              .filter((_, index) => index % 23 === 0) // 每個用戶只顯示一行
              .map((userData, userIndex) => (
                <div key={userIndex} className={styles.heatmapRow}>
                  <div className={styles.siteCell}>
                    {userData.site}
                  </div>
                  <div className={styles.userNameCell}>
                    {userData.username}
                  </div>
                  <div className={styles.statusCells}>
                    {Array.from({ length: 23 }, (_, dayIndex) => {
                      const dayData = heatmapData.find(
                        data => data.username === userData.username && 
                        data.date === `2025-07-${String(dayIndex + 1).padStart(2, '0')}`
                      );
                      
                      if (!dayData) return <div key={dayIndex} className={styles.statusCell}></div>;
                      
                      const statusClass = dayData.status === 'checkin' 
                        ? styles.checkin 
                        : dayData.status === 'leave' 
                        ? styles.leave 
                        : dayData.status === 'holiday'
                        ? styles.holiday
                        : styles.pending;
                      
                      return (
                        <div 
                          key={dayIndex} 
                          className={`${styles.statusCell} ${statusClass}`}
                          onClick={() => handleEmployeeClick(dayData)}
                          title={`${dayData.username} - ${dayData.date} - ${dayData.status}`}
                        >
                          {dayData.status === 'leave' && dayData.leaveType && (
                            <span className={styles.leaveType}>
                              {dayData.leaveType === 'personal leave' ? 'P' : 'S'}
                            </span>
                          )}
                          {dayData.status === 'holiday' && (
                            <span className={styles.holidayType}>H</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 員工詳情彈窗 */}
      {showEmployeeModal && selectedEmployee && (
        <div className={styles.modalOverlay} onClick={closeEmployeeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>員工詳情</h3>
              <button className={styles.closeButton} onClick={closeEmployeeModal}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.employeeInfo}>
                <p><strong>姓名：</strong>{selectedEmployee.username}</p>
                <p><strong>電話：</strong>{selectedEmployee.phone}</p>
                <p><strong>部門：</strong>{selectedEmployee.department}</p>
                <p><strong>日期：</strong>{selectedEmployee.date}</p>
                <p><strong>狀態：</strong>{selectedEmployee.status}</p>
                {selectedEmployee.leaveType && (
                  <p><strong>請假類型：</strong>{selectedEmployee.leaveType}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Summary; 