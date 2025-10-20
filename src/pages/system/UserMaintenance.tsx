import { useState, useEffect } from 'react';
import styles from './UserMaintenance.module.css';
import Table from '../../components/Table';
import Alert from '../../components/Alert';
import { userAPI } from '../../api/api';

interface User {
  useraccount: string;
  username: string;
  tel: string;
  location: string;
  systems: Array<{
    systemName: string;
    roles: string[];
  }>;
}


const UserMaintenance = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // Alert 相關狀態
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning' as const
  });

  // 獲取所有用戶資料
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userAPI.getAllUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('獲取用戶資料失敗:', error);
      setError('獲取用戶資料失敗');
    } finally {
      setLoading(false);
    }
  };

  // 更新用戶資料
  const updateUser = async (useraccount: string, userData: Partial<User>) => {
    try {
      const response = await userAPI.updateUser(useraccount, userData);
      // 更新本地狀態
      setUsers(users.map(user => 
        user.useraccount === useraccount ? response.data : user
      ));
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('更新用戶資料失敗:', error);
      throw error;
    }
  };

  // 刪除用戶
  const deleteUser = async (useraccount: string) => {
    try {
      await userAPI.deleteUser(useraccount);
      // 從本地狀態中移除
      setUsers(users.filter(user => user.useraccount !== useraccount));
    } catch (error) {
      console.error('刪除用戶失敗:', error);
      throw error;
    }
  };

  // 處理編輯按鈕點擊
  const handleEdit = (user: User) => {
    setEditingUser({ ...user });
    setIsEditModalOpen(true);
  };

  // 處理刪除按鈕點擊
  const handleDelete = (user: User) => {
    setAlertConfig({
      isOpen: true,
      title: '確認刪除',
      message: `您確定要刪除用戶 "${user.username}" (${user.useraccount}) 嗎？此操作無法復原。`,
      onConfirm: async () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await deleteUser(user.useraccount);
        } catch (error) {
          setError('刪除用戶失敗');
        }
      },
      type: 'warning'
    });
  };

  // 處理編輯表單提交
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUser(editingUser.useraccount, {
        username: editingUser.username,
        tel: editingUser.tel,
        location: editingUser.location,
        systems: editingUser.systems
      });
    } catch (error) {
      setError('更新用戶資料失敗');
    }
  };

  // 過濾用戶資料
  const filteredUsers = users.filter(user => {
    if (!searchKeyword) return true;
    const keyword = searchKeyword.toLowerCase();
    return (
      user.username.toLowerCase().includes(keyword) ||
      user.useraccount.toLowerCase().includes(keyword) ||
      user.location.toLowerCase().includes(keyword) ||
      user.tel.includes(keyword)
    );
  });

  // 表格列定義
  const columns = [
    { 
      title: '帳號',
      key: 'useraccount'
    },
    { 
      title: '姓名', 
      key: 'username'
    },
    { 
      title: '電話', 
      key: 'tel'
    },
    { 
      title: '地點', 
      key: 'location'
    },
    { 
      title: '系統權限', 
      key: 'systems',
      render: (user: User) => (
        <div className={styles.systemsContainer}>
          {user.systems.map((system, index) => (
            <div key={index} className={styles.systemItem}>
              <span className={styles.systemName}>{system.systemName}</span>
              <span className={styles.rolesCount}>({system.roles.length}個權限)</span>
            </div>
          ))}
        </div>
      )
    },
    { 
      title: '操作', 
      key: 'actions',
      render: (user: User) => (
        <div className={styles.actionButtons}>
          <button 
            className={`${styles.actionButton} ${styles.editButton}`}
            onClick={() => handleEdit(user)}
          >
            編輯
          </button>
          <button 
            className={`${styles.actionButton} ${styles.deleteButton}`}
            onClick={() => handleDelete(user)}
          >
            刪除
          </button>
        </div>
      )
    }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className={styles.container}>
      {/* Alert 組件 */}
      <Alert
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
        type={alertConfig.type}
        confirmText="確認"
        cancelText="取消"
      />

      {/* 編輯用戶 Modal */}
      {isEditModalOpen && editingUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>編輯用戶資料</h3>
              <button 
                className={styles.closeButton}
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>帳號</label>
                <input 
                  type="text" 
                  value={editingUser.useraccount}
                  disabled
                  className={styles.disabledInput}
                />
              </div>
              <div className={styles.formGroup}>
                <label>姓名</label>
                <input 
                  type="text" 
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    username: e.target.value
                  })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>電話</label>
                <input 
                  type="tel" 
                  value={editingUser.tel}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    tel: e.target.value
                  })}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>地點</label>
                <input 
                  type="text" 
                  value={editingUser.location}
                  onChange={(e) => setEditingUser({
                    ...editingUser,
                    location: e.target.value
                  })}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button"
                  className={`${styles.actionButton} ${styles.cancelButton}`}
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                  }}
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className={`${styles.actionButton} ${styles.saveButton}`}
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 頁面標題 */}
      <div className={styles.header}>
        <h1>用戶管理</h1>
        <p>管理系統中的所有用戶資料</p>
      </div>

      {/* 搜尋區域 */}
      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <input 
            type="text" 
            placeholder="搜尋用戶..."
            className={styles.searchInput}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <div className={styles.stats}>
          <span className={styles.statText}>
            共 {filteredUsers.length} 位用戶
          </span>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* 表格區域 */}
      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loading}>載入中...</div>
        ) : (
          <Table 
            columns={columns} 
            data={filteredUsers} 
          />
        )}
      </div>
    </div>
  );
};

export default UserMaintenance;
