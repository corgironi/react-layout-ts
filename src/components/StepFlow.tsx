import React from 'react';
import styles from './StepFlow.module.css';

export interface StepFlowStep {
  id: string;
  title: string; // 步驟標題
  comment?: string; // 步驟描述/判定內容
  timestamp?: string; // 時間戳
  responsible?: string; // 負責人
  status: 'completed' | 'active' | 'pending' | 'error'; // 步驟狀態
  actionButton?: {
    label: string;
    icon?: string;
    onClick: () => void;
    variant?: 'primary' | 'warning' | 'danger';
  };
}

export interface StepFlowProps {
  steps: StepFlowStep[];
  className?: string;
}

const StepFlow: React.FC<StepFlowProps> = ({ steps, className = '' }) => {
  const getStepIcon = (step: StepFlowStep, index: number) => {
    if (step.status === 'completed') {
      return (
        <div className={`${styles.stepIcon} ${styles.stepIconCompleted}`}>
          <i className="fas fa-check"></i>
        </div>
      );
    }
    if (step.status === 'error') {
      return (
        <div className={`${styles.stepIcon} ${styles.stepIconError}`}>
          <i className="fas fa-times"></i>
        </div>
      );
    }
    if (step.status === 'active') {
      return (
        <div className={`${styles.stepIcon} ${styles.stepIconActive}`}>
          <span>{index + 1}</span>
        </div>
      );
    }
    // pending
    return (
      <div className={`${styles.stepIcon} ${styles.stepIconPending}`}>
        <span>{index + 1}</span>
      </div>
    );
  };

  const getStatusBadge = (step: StepFlowStep) => {
    if (step.status === 'active') {
      return (
        <span className={`${styles.statusBadge} ${styles.statusBadgeActive}`}>
          進行中
        </span>
      );
    }
    if (step.status === 'error') {
      return (
        <span className={`${styles.statusBadge} ${styles.statusBadgeError}`}>
          異常
        </span>
      );
    }
    if (step.status === 'completed') {
      return (
        <span className={`${styles.statusBadge} ${styles.statusBadgeCompleted}`}>
          已完成
        </span>
      );
    }
    return null;
  };

  const getActionButtonClass = (variant?: 'primary' | 'warning' | 'danger') => {
    switch (variant) {
      case 'warning':
        return styles.actionButtonWarning;
      case 'danger':
        return styles.actionButtonDanger;
      default:
        return styles.actionButtonPrimary;
    }
  };

  return (
    <div className={`${styles.stepFlow} ${className}`}>
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`${styles.stepItem} ${styles[`step-${step.status}`]}`}
        >
          {/* 步驟左側圖標和連接線 */}
          <div className={styles.stepLeft}>
            {getStepIcon(step, index)}
            {index < steps.length - 1 && (
              <div
                className={`${styles.stepConnector} ${
                  step.status === 'completed' ? styles.connectorCompleted : ''
                }`}
              />
            )}
          </div>

          {/* 步驟內容區域 */}
          <div className={styles.stepContent}>
            <div className={styles.stepHeader}>
              <div className={styles.stepTitleWrapper}>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                {getStatusBadge(step)}
              </div>
            </div>

            {step.comment && (
              <div className={styles.stepComment}>{step.comment}</div>
            )}

            <div className={styles.stepMeta}>
              {step.timestamp && (
                <span className={styles.stepTimestamp}>{step.timestamp}</span>
              )}
              {step.responsible && (
                <span className={styles.stepResponsible}>
                  負責人: {step.responsible}
                </span>
              )}
            </div>

            {/* 操作按鈕（僅在當前活動步驟顯示） */}
            {step.status === 'active' && step.actionButton && (
              <div className={styles.stepActions}>
                <button
                  className={`${styles.actionButton} ${getActionButtonClass(
                    step.actionButton.variant
                  )}`}
                  onClick={step.actionButton.onClick}
                >
                  {step.actionButton.icon && (
                    <i className={step.actionButton.icon}></i>
                  )}
                  <span>{step.actionButton.label}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StepFlow;
