// @ts-nocheck
import { useState } from 'react';
import { Outlet } from 'react-router';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import styles from './MainLayout.module.css';

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`${styles.layout} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      {/* 左側邊欄 */}
      <div className={styles.sidebar}>
        <Sidebar collapsed={collapsed} onCollapse={toggleSidebar} />
      </div>

      {/* 右側主要內容區域 */}
      <div className={styles.mainContent}>
        {/* 頂部 Header */}
        <div className={styles.headerContainer}>
          <Header onToggleSidebar={toggleSidebar} />
        </div>

        {/* 內容區域 */}
        <div className={styles.contentWrapper}>
          <div className={styles.pageContainer}>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout; 