import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router';
import styles from './SystemPage.module.css';

const SystemPage = () => {
  const [activeTab, setActiveTab] = useState('createuser');
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    switch(tab) {
      case 'createuser':
        navigate('/system/createuser');
        break;
      case 'usermaintenance':
        navigate('/system/usermaintenance');
        break;
      // 可以在這裡添加更多tab
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1>系統設定</h1>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'createuser' ? styles.active : ''}`}
            onClick={() => handleTabChange('createuser')}
          >
            <i className="fas fa-user-plus"></i>
            創建使用者
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'usermaintenance' ? styles.active : ''}`}
            onClick={() => handleTabChange('usermaintenance')}
          >
            <i className="fas fa-users-cog"></i>
            用戶管理
          </button>
          {/* 預留其他tab位置 */}
        </div>
      </div>

      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default SystemPage; 