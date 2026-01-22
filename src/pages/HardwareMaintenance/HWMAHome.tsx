import { useState } from 'react';
import styles from './HardwareMaintenance.module.css';
import WarningBanner, { WarningBannerItem } from '../../components/WarningBanner';
import Card from '../../components/Card';

interface RepairOrder {
  reportNumber: string;
  repairPerson: string;
  employeeId: string;
  location: string;
  equipmentName: string;
  problemDescription: string;
  borrowedEquipment: string;
  subOrderQuantity: number;
  status: 'repairing' | 'waiting' | 'completed';
  repairDate: string;
}

const HWMAHome = () => {
  const [filter, setFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');

  // 假資料 - 警告橫幅項目
  const warningItems: WarningBannerItem[] = [
    {
      id: 'hwma-warning-001',
      systemName: 'hardware-maintenance',
      warningLevel: 'warning',
      warningTitle: '設備維修提醒',
      warningMessage: '目前有 3 件設備等待維修，請盡快處理',
      warningData: {
        '等待數量': 3,
        '優先級': '高',
        '影響地點': '台中、新竹'
      },
      warningCreator: ['維修系統'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'hwma-info-001',
      systemName: 'hardware-maintenance',
      warningLevel: 'info',
      warningTitle: '維修進度通知',
      warningMessage: '本週已完成 12 件維修案件，效率提升 15%',
      warningData: {
        '完成數量': 12,
        '效率提升': '15%',
        '平均處理時間': '2.4 天'
      },
      warningCreator: ['系統管理員'],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    }
  ];

  // 處理警告項目點擊
  const handleWarningClick = (item: WarningBannerItem) => {
    console.log('警告項目被點擊:', item);
    // 這裡可以添加導航到相關頁面或顯示詳細信息的邏輯
  };

  // 處理警告項目關閉
  const handleWarningDismiss = (itemId: string) => {
    console.log('關閉警告項目:', itemId);
    // 這裡可以添加從狀態中移除項目的邏輯
  };

  // 假資料 - KPI 數據
  const kpiData = [
    {
      title: '維修中案件',
      value: '24',
      change: '+12%',
      changeType: 'positive' as const,
      icon: '🔧',
      color: 'blue'
    },
    {
      title: '設備等待',
      value: '18',
      change: '+8%',
      changeType: 'positive' as const,
      icon: '⏰',
      color: 'yellow'
    },
    {
      title: '已完成',
      value: '156',
      change: '+23%',
      changeType: 'positive' as const,
      icon: '✅',
      color: 'green'
    },
    {
      title: '平均處理時間',
      value: '2.4天',
      change: '-15%',
      changeType: 'negative' as const,
      icon: '⏱️',
      color: 'purple'
    }
  ];

  // 假資料 - 報修單列表
  const repairOrders: RepairOrder[] = [
    {
      reportNumber: 'Case-2024-001',
      repairPerson: '張三',
      employeeId: '123456',
      location: '台中',
      equipmentName: 'Dell Latitude 5420',
      problemDescription: '電腦無法開機,疑似主機板故障',
      borrowedEquipment: 'HP123',
      subOrderQuantity: 2,
      status: 'repairing',
      repairDate: '2024-10-20'
    },
    {
      reportNumber: 'Case-2024-002',
      repairPerson: '李四',
      employeeId: '234567',
      location: '新竹',
      equipmentName: 'HP EliteBook 840',
      problemDescription: '螢幕顯示異常,有閃爍現象',
      borrowedEquipment: 'HP124',
      subOrderQuantity: 1,
      status: 'waiting',
      repairDate: '2024-10-19'
    },
    {
      reportNumber: 'Case-2024-003',
      repairPerson: '王五',
      employeeId: '345678',
      location: '高雄',
      equipmentName: 'Lenovo ThinkPad X1',
      problemDescription: '鍵盤按鍵失靈',
      borrowedEquipment: 'HP125',
      subOrderQuantity: 3,
      status: 'repairing',
      repairDate: '2024-10-18'
    }
  ];

  // 過濾報修單
  const filteredOrders = repairOrders.filter(order => {
    if (filter !== '全部' && order.status !== filter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.reportNumber.toLowerCase().includes(query) ||
        order.repairPerson.toLowerCase().includes(query) ||
        order.equipmentName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // 獲取狀態標籤文字和樣式
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'repairing':
        return { text: '維修中', className: styles.statusRepairing };
      case 'waiting':
        return { text: '設備等待', className: styles.statusWaiting };
      case 'completed':
        return { text: '已完成', className: styles.statusCompleted };
      default:
        return { text: status, className: '' };
    }
  };

  return (
    <div className={styles.container}>
      {/* 警告橫幅 - 使用 medium 尺寸 */}
      <WarningBanner
        items={warningItems}
        size="medium"
        onItemClick={handleWarningClick}
        onDismiss={handleWarningDismiss}
      />

      {/* KPI 卡片區域 */}
      <div className={styles.kpiSection}>
        {kpiData.map((kpi, index) => (
          <Card
            key={index}
            variant="default"
            size="medium"
            borderColor={kpi.color as 'blue' | 'yellow' | 'green' | 'purple'}
            icon={kpi.icon}
            iconPosition="left"
            iconSize="medium"
            isClickable={true}
            onClick={() => console.log(`點擊了 ${kpi.title}`)}
            className={styles.kpiCard}
          >
            <div className={styles.kpiContent}>
              <div className={styles.kpiTitle}>{kpi.title}</div>
              <div className={styles.kpiValue}>{kpi.value}</div>
              <div className={`${styles.kpiChange} ${kpi.changeType === 'positive' ? styles.positive : styles.negative}`}>
                {kpi.change}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 報修單管理區域 */}
      <div className={styles.repairOrderSection}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <i className="fas fa-file-alt"></i>
            <span>報修單管理</span>
          </div>
          <div className={styles.headerActions}>
            <select 
              className={styles.filterSelect}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="全部">全部</option>
              <option value="repairing">維修中</option>
              <option value="waiting">設備等待</option>
              <option value="completed">已完成</option>
            </select>
            <div className={styles.searchBar}>
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="搜尋報案單號、報修人、設備..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className={styles.addButton}>
              <i className="fas fa-plus"></i>
              <span>新增報修</span>
            </button>
          </div>
        </div>

        {/* 報修單表格 */}
        <div className={styles.tableWrapper}>
          <table className={styles.repairTable}>
            <thead>
              <tr>
                <th>報案單號</th>
                <th>報修人</th>
                <th>員工工號</th>
                <th>地點</th>
                <th>設備名稱</th>
                <th>問題描述</th>
                <th>借用設備</th>
                <th>子單數量</th>
                <th>狀態</th>
                <th>報修日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, index) => {
                const statusInfo = getStatusInfo(order.status);
                return (
                  <tr key={index}>
                    <td>{order.reportNumber}</td>
                    <td>{order.repairPerson}</td>
                    <td>{order.employeeId}</td>
                    <td>{order.location}</td>
                    <td>{order.equipmentName}</td>
                    <td>{order.problemDescription}</td>
                    <td>{order.borrowedEquipment}</td>
                    <td>
                      <span className={styles.subOrderBadge}>{order.subOrderQuantity}</span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusInfo.className}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td>{order.repairDate}</td>
                    <td>
                      <button className={styles.actionButton}>
                        <i className="fas fa-list"></i>
                        <span>子單管理</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HWMAHome;
