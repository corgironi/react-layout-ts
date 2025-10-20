import { useState } from 'react';
import styles from './CreateLocalUser.module.css';
import { authAPI } from '../../api/api';

interface CreateUserForm {
  username: string;
  employeeId: string;
  name: string;
  site: string;
}

const CreateLocalUser = () => {
  const [form, setForm] = useState<CreateUserForm>({
    username: '',
    employeeId: '',
    name: '',
    site: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({
    type: null,
    text: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: null, text: '' });

    try {
      // 驗證表單
      if (!form.username || !form.employeeId || !form.name || !form.site) {
        setMessage({
          type: 'error',
          text: '請填寫所有必填欄位'
        });
        setLoading(false);
        return;
      }

      // 調用API創建使用者
      await authAPI.createUser(form);
      
      setMessage({
        type: 'success',
        text: '使用者創建成功！'
      });
      
      // 重置表單
      setForm({
        username: '',
        employeeId: '',
        name: '',
        site: ''
      });
      
    } catch (error) {
      console.error('創建使用者失敗:', error);
      setMessage({
        type: 'error',
        text: '創建使用者失敗，請稍後再試'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h2>創建本地使用者</h2>
        
        {message.type && (
          <div className={`${styles.message} ${styles[message.type]}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              <i className="fas fa-user"></i>
              帳號 *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={form.username}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="請輸入使用者帳號"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="employeeId" className={styles.label}>
              <i className="fas fa-id-card"></i>
              工號 *
            </label>
            <input
              type="text"
              id="employeeId"
              name="employeeId"
              value={form.employeeId}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="請輸入員工工號"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.label}>
              <i className="fas fa-user-circle"></i>
              姓名 *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="請輸入使用者姓名"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="site" className={styles.label}>
              <i className="fas fa-building"></i>
              廠區 *
            </label>
            <select
              id="site"
              name="site"
              value={form.site}
              onChange={handleInputChange}
              className={styles.input}
              required
            >
              <option value="">請選擇廠區</option>
              <option value="A廠">A廠</option>
              <option value="B廠">B廠</option>
              <option value="C廠">C廠</option>
              <option value="總部">總部</option>
            </select>
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  創建中...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i>
                  創建使用者
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLocalUser; 