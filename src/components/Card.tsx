import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isClickable?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
  size?: 'small' | 'medium' | 'large'; // 卡片尺寸
  borderColor?: 'blue' | 'yellow' | 'green' | 'purple' | 'red' | 'orange' | 'primary' | 'none'; // 邊框顏色
  icon?: string | React.ReactNode; // 圖標（emoji 或 React 組件）
  iconPosition?: 'left' | 'top' | 'right'; // 圖標位置
  iconSize?: 'small' | 'medium' | 'large'; // 圖標大小
  title?: string; // 標題
  subtitle?: string; // 副標題
  href?: string; // 連結地址（如果提供，會渲染為 <a> 標籤）
  padding?: 'none' | 'small' | 'medium' | 'large'; // 自定義內邊距
  shadow?: 'none' | 'small' | 'medium' | 'large'; // 自定義陰影
  gradient?: boolean; // 背景漸變
  badge?: React.ReactNode; // 角標
  actions?: React.ReactNode; // 操作按鈕
  loading?: boolean; // 載入狀態
  disabled?: boolean; // 禁用狀態
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  onClick, 
  isClickable = false,
  variant = 'default',
  size = 'medium',
  borderColor,
  icon,
  iconPosition = 'left',
  iconSize = 'medium',
  title,
  subtitle,
  href,
  padding,
  shadow,
  gradient = false,
  badge,
  actions,
  loading = false,
  disabled = false
}) => {
  const handleClick = () => {
    if (!disabled && !loading && isClickable && onClick) {
      onClick();
    }
  };

  const hasIcon = !!icon;
  const hasHeader = !!(title || subtitle);
  
  const cardClasses = [
    styles.card,
    styles[variant],
    styles[`size-${size}`],
    (isClickable || href) && !disabled && !loading ? styles.clickable : '',
    borderColor ? styles[`border-${borderColor}`] : '',
    padding ? styles[`padding-${padding}`] : '',
    shadow ? styles[`shadow-${shadow}`] : '',
    hasIcon ? styles[`icon-${iconPosition}`] : '',
    iconSize ? styles[`icon-size-${iconSize}`] : '',
    gradient ? styles.gradient : '',
    disabled ? styles.disabled : '',
    loading ? styles.loading : '',
    className
  ].filter(Boolean).join(' ');

  const cardContent = (
    <>
      {badge && (
        <div className={styles.cardBadge}>
          {badge}
        </div>
      )}
      {loading && (
        <div className={styles.cardLoading}>
          <div className={styles.spinner}></div>
        </div>
      )}
      {icon && iconPosition === 'left' && (
        <div className={styles.cardIcon}>
          {typeof icon === 'string' ? <span>{icon}</span> : icon}
        </div>
      )}
      <div className={styles.cardContentWrapper}>
        {hasHeader && (
          <div className={styles.cardHeader}>
            {title && <h3 className={styles.cardTitle}>{title}</h3>}
            {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
          </div>
        )}
        <div className={styles.cardBody}>
          {children}
        </div>
        {actions && (
          <div className={styles.cardActions}>
            {actions}
          </div>
        )}
      </div>
      {icon && iconPosition === 'right' && (
        <div className={styles.cardIcon}>
          {typeof icon === 'string' ? <span>{icon}</span> : icon}
        </div>
      )}
      {icon && iconPosition === 'top' && (
        <div className={styles.cardIconTop}>
          {typeof icon === 'string' ? <span>{icon}</span> : icon}
        </div>
      )}
    </>
  );

  // 如果有 href，渲染為連結
  if (href && !disabled) {
    return (
      <a 
        href={href}
        className={cardClasses}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <div 
      className={cardClasses}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={disabled || loading ? -1 : (isClickable ? 0 : undefined)}
      aria-disabled={disabled}
      aria-busy={loading}
    >
      {cardContent}
    </div>
  );
};

export default Card; 