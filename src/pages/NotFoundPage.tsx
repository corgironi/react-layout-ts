import { useNavigate } from 'react-router';
import styles from './NotFoundPage.module.css';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1>404</h1>
        <p>抱歉，找不到您要的頁面</p>
        <button 
          className={styles.backButton}
          onClick={() => navigate('/')}
        >
          <i className="fas fa-home"></i>
          返回首頁
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage; 