import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import useAuthStore from '../store/useAuthStore';

export const useAuth = () => {
  const { 
    isAuthenticated, 
    user, 
    login, 
    logout, 
    checkAuth 
  } = useAuthStore();
  
  const navigate = useNavigate();

  // 自動 Token 刷新
  useEffect(() => {
    if (!isAuthenticated) return;
    
    checkAuth();
    const intervalId = setInterval(() => {
      checkAuth();
    }, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, checkAuth]);

  // UI 友好的登入函數
  const handleLogin = async (username: string, password: string) => {
    try {
      await login(username, password);
      navigate('/');
    } catch (error) {
      console.error('登入失敗:', error);
      throw error;
    }
  };

  // UI 友好的登出函數
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('登出失敗:', error);
      // 即使登出失敗，也要重定向到登入頁
      navigate('/login');
    }
  };

  return {
    isAuthenticated,
    user,
    login: handleLogin,
    logout: handleLogout,
    checkAuth
  };
};

export default useAuth; 