import React from 'react';
import styles from './Card.module.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isClickable?: boolean;
  variant?: 'default' | 'elevated' | 'outlined';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  onClick, 
  isClickable = false,
  variant = 'default' 
}) => {
  const handleClick = () => {
    if (isClickable && onClick) {
      onClick();
    }
  };

  const cardClasses = [
    styles.card,
    styles[variant],
    isClickable ? styles.clickable : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={cardClasses}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default Card; 