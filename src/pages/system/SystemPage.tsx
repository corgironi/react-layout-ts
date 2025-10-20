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