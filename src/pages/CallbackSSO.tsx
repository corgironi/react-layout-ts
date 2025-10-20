import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useKeycloak } from '../hooks/useKeycloak';
import { authAPI } from '../api/api';
import useAuthStore from '../store/useAuthStore';

const CallbackSSO = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { keycloak, isInitialized, isAuthenticated } = useKeycloak();
  const { setUser } = useAuthStore();

  useEffect(() => {
    // 關鍵修改：等待 Keycloak 初始化完成
    if (!isInitialized) {
      console.log('等待 Keycloak 初始化...');
      return;
    }

    const handleCallback = async () => {
      try {
        // 使用 hook 提供的狀態進行雙重檢查
        if (isAuthenticated && keycloak?.authenticated) {
          console.log('SSO 認證成功，開始處理 tokens...');
          
          // 儲存 SSO tokens
          if (keycloak) {
            localStorage.setItem('sso_idtoken', keycloak.idToken || '');
            localStorage.setItem('sso_accesstoken', keycloak.token || '');
            localStorage.setItem('sso_refreshtoken', keycloak.refreshToken || '');
          }

          // 設置預登入狀態為 SSO
          localStorage.setItem('preLoginType', 'sso');

          try {
            // 獲取應用程式 tokens
            const response = await authAPI.ssoLogin();
            const { access_token: accessToken, refresh_token: refreshToken } = response;
            
            // 安全檢查使用者資訊，提供預設值
            const user = response.user || {
              id: '',
              username: '',
              name: '',
              email: '',
              role: 'user'
            };
            
            localStorage.setItem('access_token', accessToken);
            localStorage.setItem('refresh_token', refreshToken);
            
            // 更新使用者資訊
            setUser({ ...user, authType: 'sso' });

            console.log('SSO 登入處理完成，準備重定向...');
            
            // 重新導向到之前的頁面或首頁
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
          } catch (error) {
            console.error('獲取應用程式 Token 失敗:', error);
            
            // 清除所有 tokens
            localStorage.removeItem('sso_idtoken');
            localStorage.removeItem('sso_accesstoken');
            localStorage.removeItem('sso_refreshtoken');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('preLoginType');

            // 重定向到錯誤頁面
            navigate('/error', {
              replace: true,
              state: {
                errorCode: 'AUTH_ERROR',
                errorMessage: '獲取應用程式 Token 失敗',
                errorDetails: error instanceof Error ? error.message : '未知錯誤'
              }
            });
          }
        } else {
          console.log('認證失敗 - Keycloak 初始化完成但未認證');
          if (keycloak) {
            console.log('keycloak.authenticated:', keycloak.authenticated);
          }
          // 如果認證失敗，重新導向到登入頁
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('SSO 回調錯誤:', error);
        navigate('/error', {
          replace: true,
          state: {
            errorCode: 'SSO_ERROR',
            errorMessage: 'SSO 認證過程發生錯誤',
            errorDetails: error instanceof Error ? error.message : '未知錯誤'
          }
        });
      }
    };

    handleCallback();
  }, [keycloak, isInitialized, isAuthenticated, navigate, location, setUser]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <div>
        {!isInitialized ? '正在初始化 SSO...' : '正在處理 SSO 登入...'}
      </div>
    </div>
  );
};

export default CallbackSSO; 