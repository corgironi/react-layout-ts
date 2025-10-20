import { Navigate, useLocation } from 'react-router';
import { useState, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';

interface PrivateRouteProps {
  element: React.ReactElement;
  requireSSO?: boolean;
}

const PrivateRoute = ({ element, requireSSO = false }: PrivateRouteProps) => {
  const { isAuthenticated, authType, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      if (!isAuthenticated) {
        await checkAuth();
      }
      setIsChecking(false);
    };

    verifyAuth();
  }, [isAuthenticated, checkAuth]);

  if (isChecking) {
    return <div>載入中...</div>;
  }

  // 檢查是否需要 SSO 但當前是 local 認證
  if (requireSSO && authType !== 'sso') {
    return <Navigate to="/sso-login" state={{ from: location }} replace />;
  }

  return isAuthenticated ? 
    element : 
    <Navigate to="/login" state={{ from: location }} replace />;
};

export default PrivateRoute; 