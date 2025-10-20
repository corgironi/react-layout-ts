import { useLocation, useNavigate } from 'react-router';
import styles from './ErrorPage.module.css';

interface ErrorState {
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: string;
}

const ErrorPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const errorState = location.state as ErrorState;

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.errorCard}>
        <h1 className={styles.errorTitle}>系統錯誤</h1>
        
        {errorState?.errorCode && (
          <div className={styles.errorCode}>
            錯誤代碼: {errorState.errorCode}
          </div>
        )}
        
        {errorState?.errorMessage && (
          <div className={styles.errorMessage}>
            {errorState.errorMessage}
          </div>
        )}
        
        {errorState?.errorDetails && (
          <div className={styles.errorDetails}>
            {errorState.errorDetails}
          </div>
        )}

        <button 
          className={styles.backButton}
          onClick={handleBackToLogin}
        >
          返回登入頁面
        </button>
      </div>
    </div>
  );
};

export default ErrorPage; 