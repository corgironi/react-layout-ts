import { useNavigate, useLocation } from 'react-router';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: () => void;
}

const Sidebar = ({ collapsed, onCollapse }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.logo}>
          <span className={styles.logoLarge}>LOGO</span>
          <span className={styles.logoSmall}>L</span>
        </div>
        <button className={styles.collapseBtn} onClick={onCollapse}>
          <i className={`fas fa-${collapsed ? 'angle-right' : 'angle-left'}`}></i>
        </button>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navGroup}>
          <div className={styles.navTitle}>主要功能</div>
          <div 
            className={`${styles.navItem} ${location.pathname === '/' ? styles.active : ''}`}
            onClick={() => navigate('/')}
          >
            <i className="fas fa-home"></i>
            <span>首頁</span>
          </div>
          <div 
            className={`${styles.navItem} ${location.pathname === '/attendance' ? styles.active : ''}`}
            onClick={() => navigate('/attendance')}
          >
            <i className="fas fa-clock"></i>
            <span>出勤系統</span>
          </div>
          <div className={styles.navGroup}>
            <div className={styles.navTitle}>維修管理</div>
            <div 
              className={`${styles.navItem} ${location.pathname.startsWith('/hardware-maintenance') ? styles.active : ''}`}
              onClick={() => navigate('/hardware-maintenance')}
            >
              <i className="fas fa-file-alt"></i>
              <span>報修單管理</span>
            </div>
            <div className={styles.navItem}>
              <i className="fas fa-search"></i>
              <span>維修單管理</span>
            </div>
            <div className={styles.navItem}>
              <i className="fas fa-book-open"></i>
              <span>價格手冊</span>
            </div>
          </div>
          <div className={styles.navGroup}>
            <div className={styles.navTitle}>系統管理</div>
            <div className={styles.navItem}>
              <i className="fas fa-chart-bar"></i>
              <span>統計報表</span>
            </div>
            <div 
              className={`${styles.navItem} ${location.pathname.startsWith('/system') ? styles.active : ''}`}
              onClick={() => navigate('/system/createuser')}
            >
              <i className="fas fa-cog"></i>
              <span>系統設定</span>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar; 