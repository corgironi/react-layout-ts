import { useNavigate, useLocation } from 'react-router';
import useAuthStore from '../store/useAuthStore';
import {
  getHardwareMaintenanceSystem,
  getHwmaSidebarItems,
  isSystemShellVisible,
} from '../lib/systemPermissions';
import styles from './Sidebar.module.css';

interface SidebarProps {
  collapsed: boolean;
  onCollapse: () => void;
}

const Sidebar = ({ collapsed, onCollapse }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const hwSys = getHardwareMaintenanceSystem(user?.systems);
  const hwNavItems =
    hwSys && isSystemShellVisible(hwSys) ? getHwmaSidebarItems(hwSys) : [];
  const visibleHwNavItems = hwNavItems.filter((item) => item.visible);
  const showHwmaNav = visibleHwNavItems.length > 0;

  const isHwmaMainNavActive =
    location.pathname === '/hardware-maintenance' ||
    (location.pathname.startsWith('/hardware-maintenance/') &&
      !location.pathname.startsWith('/hardware-maintenance/pricebook-mgt'));

  const isHwmaPricebookActive = location.pathname.startsWith('/hardware-maintenance/pricebook-mgt');

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
        </div>

        {showHwmaNav && (
          <div className={styles.navGroup}>
            <div className={styles.navTitle}>維修管理</div>
            {visibleHwNavItems.map((item) => {
                const active =
                  item.subKey === 'main' ? isHwmaMainNavActive : isHwmaPricebookActive;
                const disabled = item.disabled;
                return (
                  <div
                    key={item.subKey}
                    className={`${styles.navItem} ${active ? styles.active : ''} ${
                      disabled ? styles.navItemDisabled : ''
                    }`}
                    onClick={() => {
                      if (!disabled) navigate(item.to);
                    }}
                  >
                    <i className={item.iconClass}></i>
                    <span>{item.label}</span>
                  </div>
                );
              })}
          </div>
        )}

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
      </nav>
    </div>
  );
};

export default Sidebar;
