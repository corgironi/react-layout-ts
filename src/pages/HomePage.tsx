import styles from './HomePage.module.css';
import useAuth from '../hooks/useAuth';
import Card from '../components/Card';
import WarningBanner, { WarningBannerItem } from '../components/WarningBanner';
import { useNavigate } from 'react-router';

interface SystemRole {
  systemName: string;
  roles: string[];
}

interface UserProfile {
  useraccount: string;
  username: string;
  tel: string;
  location: string;
  systems: SystemRole[];
}

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 固定的用戶資料
  const userProfile: UserProfile = {
    useraccount: "user001",
    username: "張三",
    tel: "0912345001",
    location: "台北",
    systems: [
      {
        systemName: "attendance",
        roles: ["admin", "boss"]
      },
      {
        systemName: "ioc",
        roles: ["site_leader"]
      }
    ]
  };

  // 假資料 - 警告橫幅項目
  const warningItems: WarningBannerItem[] = [
    {
      id: "warning-001",
      systemName: "attendance",
      warningLevel: "critical",
      warningTitle: "考勤異常警告",
      warningMessage: "今日有 5 名員工未完成打卡，請立即處理",
      warningData: {
        "未打卡人數": 5,
        "部門": "資訊部、人事部",
        "影響範圍": "全公司"
      },
      warningCreator: ["系統管理員", "人事主管"],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "warning-002",
      systemName: "attendance",
      warningLevel: "warning",
      warningTitle: "遲到提醒",
      warningMessage: "目前有 3 名員工遲到超過 30 分鐘",
      warningData: {
        "遲到人數": 3,
        "平均遲到時間": "45 分鐘",
        "最遲員工": "李小明"
      },
      warningCreator: ["考勤系統"],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "warning-003",
      systemName: "ioc",
      warningLevel: "info",
      warningTitle: "系統維護通知",
      warningMessage: "IOC 系統將於今晚 22:00-24:00 進行例行維護",
      warningData: {
        "維護時間": "22:00-24:00",
        "影響服務": "數據查詢、報表生成",
        "預計恢復": "明日 00:30"
      },
      warningCreator: ["系統管理員", "技術主管"],
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    }
  ];

  // 根據時間顯示不同的問候語
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早安';
    if (hour < 18) return '午安';
    return '晚安';
  };

  // 系統圖標映射
  const getSystemIcon = (systemName: string) => {
    const iconMap: Record<string, string> = {
      'attendance': '📊',
      'ioc': '🏭',
      'hr': '👥',
      'finance': '💰',
      'inventory': '📦',
      'reports': '📈'
    };
    return iconMap[systemName.toLowerCase()] || '🔧';
  };

  // 系統中文名稱映射
  const getSystemDisplayName = (systemName: string) => {
    const nameMap: Record<string, string> = {
      'attendance': '考勤管理',
      'ioc': 'IOC 系統',
      'hr': '人力資源',
      'finance': '財務管理',
      'inventory': '庫存管理',
      'reports': '報表系統'
    };
    return nameMap[systemName.toLowerCase()] || systemName;
  };

  // 處理系統點擊導向
  const handleSystemClick = (systemName: string) => {
    const routeMap: Record<string, string> = {
      'attendance': '/attendance',
      'ioc': '/ioc',
      'hr': '/hr',
      'finance': '/finance',
      'inventory': '/inventory',
      'reports': '/reports'
    };

    const route = routeMap[systemName.toLowerCase()];
    if (route) {
      navigate(route);
    } else {
      navigate(`/system/${systemName.toLowerCase()}`);
    }
  };

  // 處理警告項目點擊
  const handleWarningClick = (item: WarningBannerItem) => {
    console.log('警告項目被點擊:', item);
    // 這裡可以添加導航到相關系統或顯示詳細信息的邏輯
  };

  // 處理警告項目關閉
  const handleWarningDismiss = (itemId: string) => {
    console.log('關閉警告項目:', itemId);
    // 這裡可以添加從狀態中移除項目的邏輯
  };



  return (
    <div className={styles.container}>
      <div className={styles.welcome}>
        <h1>
          {getGreeting()}，{user?.username || '用戶'}！
          <span className={styles.welcomeSubtitle}>歡迎使用管理系統</span>
        </h1>
        {user && (
          <div className={styles.userWelcome}>
            <p>
              您好，{user.username}
              ，今天是 {new Date().toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
            <div className={styles.userInfo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>帳號：</span>
                <span className={styles.infoValue}>{user.useraccount}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>電話：</span>
                <span className={styles.infoValue}>{user.tel || '未設定'}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>地點：</span>
                <span className={styles.infoValue}>{user.location || '未設定'}</span>
              </div>
            </div>
            <small className={styles.loginType}>
              登入方式：{user.authType === 'sso' ? 'SSO 單一登入' : '本地帳號登入'}
            </small>
          </div>
        )}
      </div>
      
      {/* 警告橫幅 */}
      <WarningBanner
        items={warningItems}
        onItemClick={handleWarningClick}
        onDismiss={handleWarningDismiss}
      />
      
      {/* 員工權限及路口 */}
      {userProfile && userProfile.systems && userProfile.systems.length > 0 && (
        <div className={styles.systemsSection}>
          <h2 className={styles.sectionTitle}>員工權限及路口</h2>
          <div className={styles.systemsGrid}>
            {userProfile.systems.map((system: SystemRole) => (
              <Card
                key={system.systemName}
                className={styles.systemCard}
                onClick={() => handleSystemClick(system.systemName)}
                isClickable={true}
                variant="elevated"
              >
                <div className={styles.cardHeader}>
                  <div className={styles.systemIcon}>
                    {getSystemIcon(system.systemName)}
                  </div>
                  <div className={styles.systemInfo}>
                    <h3 className={styles.systemName}>
                      {getSystemDisplayName(system.systemName)}
                    </h3>
                    <span className={styles.systemCode}>{system.systemName}</span>
                  </div>
                  <div className={styles.roleCount}>
                    {system.roles.length} 個權限
                  </div>
                </div>
                
                <div className={styles.rolesContainer}>
                  {system.roles.map((role: string, roleIndex: number) => (
                    <span key={roleIndex} className={styles.roleTag}>
                      {role}
                    </span>
                  ))}
                </div>
                
                <div className={styles.cardFooter}>
                  <span className={styles.clickHint}>點擊進入系統</span>
                  <span className={styles.arrow}>→</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 如果沒有系統權限，顯示提示 */}
      {userProfile && (!userProfile.systems || userProfile.systems.length === 0) && (
        <div className={styles.noSystems}>
          <p>暫無系統權限資訊</p>
        </div>
      )}
    </div>
  );
};

export default HomePage; 