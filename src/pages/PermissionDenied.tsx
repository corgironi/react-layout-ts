import { Link } from 'react-router';
import styles from './PermissionDenied.module.css';

const PermissionDenied = () => (
  <div className={styles.wrap}>
    <h1 className={styles.title}>權限不足</h1>
    <p className={styles.desc}>您沒有存取此功能的權限，請聯絡管理員或改由首頁進入其他模組。</p>
    <Link className={styles.link} to="/">
      回首頁
    </Link>
  </div>
);

export default PermissionDenied;
