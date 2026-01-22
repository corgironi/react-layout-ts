import React from 'react';
import styles from './WarningBanner.module.css';

export interface WarningBannerItem {
  id: string; // 唯一ID，用於React key與追蹤
  systemName: string; // 系統名稱，如 "attendance", "payment"
  warningLevel: 'info' | 'warning' | 'critical' | 'success'; // 依嚴重程度分級，包含成功狀態
  warningTitle: string; // 警告標題
  warningMessage: string; // 詳細訊息，可含換行或HTML
  warningData?: Record<string, any>; // 附加資料，如未點名的使用者清單
  warningFilter?: string[]; // 篩選條件，如 ['attendance']
  warningCreator: string[]; // 公告人，如boss、systemowner
  createdAt: string; // ISO 日期，方便排序與過濾
  expiresAt?: string; // 過期時間 (可選)
  creator?: boolean; // 是否已被閱讀/確認
}

interface WarningBannerProps {
  items: WarningBannerItem[];
  onItemClick?: (item: WarningBannerItem) => void;
  onDismiss?: (itemId: string) => void;
  size?: 'large' | 'medium' | 'small'; // 尺寸選項，預設為 large
}

const WarningBanner: React.FC<WarningBannerProps> = ({ 
  items, 
  onItemClick, 
  onDismiss,
  size = 'large' // 預設為 large
}) => {
  // 根據警告級別獲取對應的樣式類名
  const getLevelClass = (level: 'info' | 'warning' | 'critical' | 'success') => {
    return styles[`level-${level}`];
  };

  // 根據警告級別獲取對應的圖標
  const getLevelIcon = (level: 'info' | 'warning' | 'critical' | 'success') => {
    const iconMap = {
      'info': 'ℹ️',
      'warning': '⚠️',
      'critical': '🚨',
      'success': '✅'
    };
    return iconMap[level];
  };

  // 格式化時間顯示
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 檢查是否過期
  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // 過濾掉過期的項目
  const validItems = items.filter(item => !isExpired(item.expiresAt));

  if (validItems.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.warningBanner} ${styles[`size-${size}`]}`}>
      <div className={styles.bannerHeader}>
        <h2 className={styles.bannerTitle}>系統警告</h2>
        <span className={styles.itemCount}>{validItems.length} 項警告</span>
      </div>
      
      <div className={styles.bannerGrid}>
        {validItems.map((item) => (
          <div
            key={item.id}
            className={`${styles.warningCard} ${getLevelClass(item.warningLevel)}`}
            onClick={() => onItemClick?.(item)}
          >
            <div className={styles.cardHeader}>
              <div className={styles.levelIcon}>
                {getLevelIcon(item.warningLevel)}
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardTitle}>{item.warningTitle}</h3>
                <span className={styles.systemName}>{item.systemName}</span>
              </div>
              <div className={styles.cardActions}>
                <span className={styles.timestamp}>
                  {formatTime(item.createdAt)}
                </span>
                {onDismiss && (
                  <button
                    className={styles.dismissBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(item.id);
                    }}
                    title="關閉警告"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <p className={styles.warningMessage}>{item.warningMessage}</p>
              
              {item.warningData && Object.keys(item.warningData).length > 0 && (
                <div className={styles.warningData}>
                  {Object.entries(item.warningData).map(([key, value]) => (
                    <div key={key} className={styles.dataItem}>
                      <span className={styles.dataKey}>{key}:</span>
                      <span className={styles.dataValue}>{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className={styles.cardFooter}>
              <div className={styles.creators}>
                {item.warningCreator.map((creator, index) => (
                  <span key={index} className={styles.creatorTag}>
                    {creator}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WarningBanner;
