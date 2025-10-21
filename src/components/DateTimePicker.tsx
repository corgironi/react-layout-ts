import React, { useState, useEffect, useRef } from 'react';
import styles from './DateTimePicker.module.css';

interface DateTimePickerProps {
  value: string; // 格式: "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  minuteStep?: number; // 分鐘間隔，預設為 1
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  minuteStep = 1,
  disabled = false,
  placeholder = "選擇日期時間",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedHour, setSelectedHour] = useState('00');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 生成小時選項 (00-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => 
    i.toString().padStart(2, '0')
  );

  // 生成分鐘選項 (根據 minuteStep)
  const minuteOptions = Array.from({ length: 60 / minuteStep }, (_, i) => 
    (i * minuteStep).toString().padStart(2, '0')
  );

  // 解析初始值
  useEffect(() => {
    if (value) {
      const [datePart, timePart] = value.split('T');
      if (datePart) setSelectedDate(datePart);
      if (timePart) {
        const [hour, minute] = timePart.split(':');
        setSelectedHour(hour || '00');
        setSelectedMinute(minute || '00');
      }
    }
  }, [value]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && 
          triggerRef.current && 
          dropdownRef.current &&
          !triggerRef.current.contains(event.target as Node) &&
          !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 更新日期
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    updateDateTime(date, selectedHour, selectedMinute);
  };

  // 更新小時
  const handleHourChange = (hour: string) => {
    setSelectedHour(hour);
    updateDateTime(selectedDate, hour, selectedMinute);
  };

  // 更新分鐘
  const handleMinuteChange = (minute: string) => {
    setSelectedMinute(minute);
    updateDateTime(selectedDate, selectedHour, minute);
  };

  // 更新完整的日期時間
  const updateDateTime = (date: string, hour: string, minute: string) => {
    if (date && hour && minute) {
      const dateTime = `${date}T${hour}:${minute}`;
      onChange(dateTime);
    }
  };

  // 獲取今天的日期
  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  // 計算下拉選單位置
  const calculateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // 計算下拉選單的預期高度（大約 200px）
      const dropdownHeight = 200;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top = rect.bottom + 4; // 預設在下方
      
      // 如果下方空間不夠，就放在上方
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        top = rect.top - dropdownHeight - 4;
      }
      
      // 計算水平位置，確保不超出螢幕
      let left = rect.left;
      const dropdownWidth = 500;
      
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 10;
      }
      if (left < 10) {
        left = 10;
      }
      
      setDropdownPosition({ top, left });
    }
  };

  // 獲取顯示文字
  const getDisplayText = () => {
    if (!selectedDate) return placeholder;
    
    const date = new Date(selectedDate);
    const formattedDate = date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return `${formattedDate} ${selectedHour}:${selectedMinute}`;
  };

  return (
    <div className={`${styles.dateTimePicker} ${className}`}>
      <div 
        ref={triggerRef}
        className={`${styles.trigger} ${disabled ? styles.disabled : ''}`}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) {
              calculateDropdownPosition();
            }
            setIsOpen(!isOpen);
          }
        }}
      >
        <span className={styles.displayText}>
          {getDisplayText()}
        </span>
        <span className={styles.arrow}>▼</span>
      </div>

      {isOpen && !disabled && (
        <div 
          ref={dropdownRef}
          className={styles.dropdown}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`
          }}
        >
          <div className={styles.content}>
            {/* 左側：日期選擇器 */}
            <div className={styles.dateSection}>
              <div className={styles.sectionTitle}>選擇日期</div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                min={getToday()}
                className={styles.dateInput}
              />
            </div>

            {/* 右側：時間選擇器 */}
            <div className={styles.timeSection}>
              <div className={styles.sectionTitle}>選擇時間</div>
              <div className={styles.timeInputs}>
                <div className={styles.timeGroup}>
                  <select
                    value={selectedHour}
                    onChange={(e) => handleHourChange(e.target.value)}
                    className={styles.timeSelect}
                  >
                    {hourOptions.map(hour => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <span className={styles.timeLabel}>時</span>
                </div>
                <div className={styles.timeGroup}>
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleMinuteChange(e.target.value)}
                    className={styles.timeSelect}
                  >
                    {minuteOptions.map(minute => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                  <span className={styles.timeLabel}>分</span>
                </div>
              </div>
            </div>
          </div>

          {/* 底部按鈕 */}
          <div className={styles.footer}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={styles.confirmButton}
            >
              確定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
