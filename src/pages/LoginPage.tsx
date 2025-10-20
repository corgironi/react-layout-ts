import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import useAuthStore from '../store/useAuthStore';
import { useKeycloak } from '../hooks/useKeycloak';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const { login: ssoLogin, ssoEnabled } = useKeycloak();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 獲取重定向的來源路徑
  const from = location.state?.from?.pathname || '/';

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError('登入失敗，請檢查您的帳號和密碼');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = async () => {
    if (!ssoEnabled) {
      setError('SSO 功能目前未啟用');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await ssoLogin();
      navigate(from, { replace: true });
    } catch (err) {
      setError('SSO 登入失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* 左側區域 - 標題和描述 */}
      <div className={styles.leftSection}>
        <div className={styles.leftContent}>
          <div className={styles.titleContainer}>
            <h1 className={styles.mainTitle}>IT DASHBOARD</h1>
            <div className={styles.titleUnderline}></div>
          </div>
          <p className={styles.description}>
            現代化的IT使用dashboard平台，提供全面的系統監控、數據分析和用戶管理功能，讓您輕鬆掌握IT環境的每一個細節。
          </p>
          
          {/* 裝飾性幾何圖形 */}
          <div className={styles.decorativeShapes}>
            <div className={styles.circle}></div>
            <div className={styles.triangle}></div>
            <div className={styles.square}></div>
            <div className={styles.hexagon}></div>
          </div>
        </div>
        <div className={styles.waveShape}></div>
      </div>

      {/* 右側區域 - 登入表單 */}
      <div className={styles.rightSection}>
        <div className={styles.loginContainer}>
          {/* 用戶圖標 */}
          <div className={styles.userIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
              <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="currentColor"/>
            </svg>
          </div>

          <form className={styles.form} onSubmit={handleLocalLogin}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            
            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="用戶名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
                className={styles.input}
              />
            </div>
            
            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 8H20C20.5523 8 21 8.44772 21 9V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V9C3 8.44772 3.44772 8 4 8H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <rect x="8" y="8" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <input
                type="password"
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className={styles.input}
              />
              <div className={styles.passwordToggle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </div>

            <div className={styles.forgotPassword}>
              <a href="#" className={styles.forgotLink}>忘記密碼？</a>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className={`${styles.loginButton} ${isLoading ? styles.buttonLoading : ''}`}
            >
              {isLoading ? '登入中...' : '登入'}
            </button>
          </form>

          {/* SSO 登入區域 */}
          {ssoEnabled && (
            <>
              <div className={styles.divider}>
                <div className={styles.dividerLine}></div>
                <span className={styles.dividerText}>或</span>
                <div className={styles.dividerLine}></div>
              </div>

              <button 
                className={styles.ssoButton}
                onClick={handleSSOLogin}
                disabled={isLoading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.ssoIcon}>
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isLoading ? '登入中...' : '使用 SSO 登入'}
              </button>
            </>
          )}

          {/* 創建新帳戶連結 */}
          <div className={styles.createAccount}>
            <a href="#" className={styles.createLink}>創建新帳戶</a>
          </div>

          {/* SSO 狀態提示 */}
          {!ssoEnabled && (
            <div className={styles.ssoHint}>
              💡 提示：SSO 功能目前未配置，僅可使用本地登入
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 