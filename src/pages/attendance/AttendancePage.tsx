import { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router';
import styles from './AttendancePage.module.css';

const AttendancePage = () => {
  const [activeTab, setActiveTab] = useState('daily');
  
  // 根據當前路徑設置活動標籤
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/overtime')) {
      setActiveTab('overtime');
    } else if (path.includes('/leave')) {
      setActiveTab('leave');
    } else if (path.includes('/summary')) {
      setActiveTab('summary');
    } else {
      setActiveTab('daily');
    }
  }, []);
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch(tab) {
      case 'daily':
        navigate('/attendance/daily');
        break;
      case 'leave':
        navigate('/attendance/leave');
        break;
      case 'overtime':
        navigate('/attendance/overtime');
        break;
      case 'summary':
        navigate('/attendance/summary');
        break;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>出勤管理</h1>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'daily' ? styles.active : ''}`}
            onClick={() => handleTabChange('daily')}
          >
            <i className="fas fa-calendar-day"></i>
            每日出勤
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'leave' ? styles.active : ''}`}
            onClick={() => handleTabChange('leave')}
          >
            <i className="fas fa-calendar-times"></i>
            請假系統
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'overtime' ? styles.active : ''}`}
            onClick={() => handleTabChange('overtime')}
          >
            <i className="fas fa-clock"></i>
            加班系統
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'summary' ? styles.active : ''}`}
            onClick={() => handleTabChange('summary')}
          >
            <i className="fas fa-chart-bar"></i>
            出勤統計
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default AttendancePage; 