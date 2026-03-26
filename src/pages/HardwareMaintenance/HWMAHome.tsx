import { useState, useRef, useEffect, useMemo } from 'react';
import styles from './HardwareMaintenance.module.css';
import WarningBanner, { WarningBannerItem } from '../../components/WarningBanner';
import Card from '../../components/Card';
import Pagination from '../../components/Pagination';
import {
  hardwareMaintenanceAPI,
  HWMADashboardHomeResponse,
  HWMADashboardKPI,
  HWMADashboardRepairOrder
} from '../../api/api';

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

interface RepairFormData {
  reportNumber: string;
  repairPerson: string;
  employeeId: string;
  location: string;
  equipmentName: string;
  problemDescription: string;
  borrowedEquipment: string;
  photos: File[];
}

const HWMAHome = () => {
  const ITEMS_PER_PAGE = 8;
  const [filter, setFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [warningItems, setWarningItems] = useState<WarningBannerItem[]>([]);
  const [kpiData, setKpiData] = useState<HWMADashboardKPI[]>([]);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState<RepairFormData>({
    reportNumber: '',
    repairPerson: '',
    employeeId: '',
    location: '台中',
    equipmentName: '',
    problemDescription: '',
    borrowedEquipment: '',
    photos: []
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof RepairFormData, string>>>({});
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

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

  const normalizeWarningItem = (item: any, index: number): WarningBannerItem => ({
    id: item?.id ?? `hwma-warning-${index}`,
    systemName: item?.systemName ?? 'hardware-maintenance',
    warningLevel: item?.warningLevel ?? 'info',
    warningTitle: item?.warningTitle ?? '系統通知',
    warningMessage: item?.warningMessage ?? '',
    warningData: item?.warningData ?? {},
    warningCreator: Array.isArray(item?.warningCreator) ? item.warningCreator : ['系統'],
    createdAt: item?.createdAt ?? new Date().toISOString()
  });

  const normalizeRepairOrder = (order: HWMADashboardRepairOrder): RepairOrder => ({
    reportNumber: order.reportNumber ?? '',
    repairPerson: order.repairPerson ?? '',
    employeeId: order.employeeId ?? '',
    location: order.location ?? '',
    equipmentName: order.equipmentName ?? '',
    problemDescription: order.problemDescription ?? '',
    borrowedEquipment: order.borrowedEquipment ?? '',
    subOrderQuantity: Number(order.subOrderQuantity ?? 0),
    status: order.status ?? 'waiting',
    repairDate: order.repairDate ?? ''
  });

  const getDefaultKpiData = (): HWMADashboardKPI[] => [
    { title: '維修中案件', value: 0, change: '-', changeType: 'positive', icon: '🔧', color: 'blue' },
    { title: '設備等待', value: 0, change: '-', changeType: 'positive', icon: '⏰', color: 'yellow' },
    { title: '已完成', value: 0, change: '-', changeType: 'positive', icon: '✅', color: 'green' },
    { title: '平均處理時間', value: '-', change: '-', changeType: 'negative', icon: '⏱️', color: 'purple' }
  ];

  const buildKpiFromOrders = (orders: RepairOrder[]): HWMADashboardKPI[] => {
    const repairing = orders.filter((order) => order.status === 'repairing').length;
    const waiting = orders.filter((order) => order.status === 'waiting').length;
    const completed = orders.filter((order) => order.status === 'completed').length;

    return [
      { title: '維修中案件', value: repairing, change: '-', changeType: 'positive', icon: '🔧', color: 'blue' },
      { title: '設備等待', value: waiting, change: '-', changeType: 'positive', icon: '⏰', color: 'yellow' },
      { title: '已完成', value: completed, change: '-', changeType: 'positive', icon: '✅', color: 'green' },
      { title: '平均處理時間', value: '-', change: '-', changeType: 'negative', icon: '⏱️', color: 'purple' }
    ];
  };

  const fetchHomeData = async () => {
    setIsPageLoading(true);
    setPageError('');
    try {
      const response: HWMADashboardHomeResponse = await hardwareMaintenanceAPI.getHomeData();
      const warningsSource = Array.isArray((response as any).warningItems)
        ? (response as any).warningItems
        : Array.isArray((response as any).warnings)
          ? (response as any).warnings
          : [];

      const ordersSource = Array.isArray((response as any).repairOrders)
        ? (response as any).repairOrders
        : Array.isArray((response as any).data)
          ? (response as any).data
          : [];

      const normalizedOrders = (ordersSource as HWMADashboardRepairOrder[]).map(normalizeRepairOrder);
      const kpiSource = Array.isArray((response as any).kpiData) ? (response as any).kpiData : [];

      setWarningItems(warningsSource.map(normalizeWarningItem));
      setRepairOrders(normalizedOrders);
      setKpiData(
        kpiSource.length > 0
          ? kpiSource
          : normalizedOrders.length > 0
            ? buildKpiFromOrders(normalizedOrders)
            : getDefaultKpiData()
      );
    } catch (error) {
      console.error('載入 HWMA 首頁資料失敗:', error);
      setPageError('載入首頁資料失敗，請稍後再試');
      setWarningItems([]);
      setKpiData(getDefaultKpiData());
      setRepairOrders([]);
    } finally {
      setIsPageLoading(false);
    }
  };

  // 過濾報修單
  const filteredOrders = useMemo(() => repairOrders.filter(order => {
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
  }), [repairOrders, filter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

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

  // 處理表單輸入變更
  const handleInputChange = (field: keyof RepairFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除該欄位的錯誤訊息
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 處理員工工號輸入（限制為6位數字）
  const handleEmployeeIdChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    handleInputChange('employeeId', numericValue);
  };

  // 處理載入資訊
  const handleLoadInfo = async () => {
    if (!formData.reportNumber.trim()) {
      setFormErrors(prev => ({ ...prev, reportNumber: '請輸入報案單號' }));
      return;
    }

    setIsLoadingInfo(true);
    try {
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模擬從其他系統載入的資料
      // 這裡可以根據報案單號從 API 獲取資料
      console.log('載入報案單號資訊:', formData.reportNumber);
      
      // 模擬載入的資料（實際應該從 API 獲取）
      // setFormData(prev => ({
      //   ...prev,
      //   equipmentName: '從系統載入的設備名稱',
      //   // 其他欄位...
      // }));
      
      alert('資訊載入成功（模擬）');
    } catch (error) {
      console.error('載入資訊失敗:', error);
      alert('載入資訊失敗，請檢查報案單號是否正確');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // 處理文件選擇
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length !== files.length) {
      alert('請只上傳圖片檔案');
      return;
    }

    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...imageFiles]
    }));
  };

  // 處理文件拖曳
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.add(styles.dragOver);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.remove(styles.dragOver);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.remove(styles.dragOver);
    }
    handleFileSelect(e.dataTransfer.files);
  };

  // 移除照片
  const handleRemovePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  // 表單驗證
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof RepairFormData, string>> = {};

    if (!formData.reportNumber.trim()) {
      errors.reportNumber = '請輸入報案單號';
    }

    if (!formData.repairPerson.trim()) {
      errors.repairPerson = '請輸入報修人姓名';
    }

    if (!formData.employeeId.trim()) {
      errors.employeeId = '請輸入員工工號';
    } else if (formData.employeeId.length !== 6) {
      errors.employeeId = '員工工號必須為6位數字';
    }

    if (!formData.location) {
      errors.location = '請選擇地點';
    }

    if (!formData.equipmentName.trim()) {
      errors.equipmentName = '請輸入電腦設備名稱';
    }

    if (!formData.problemDescription.trim()) {
      errors.problemDescription = '請詳細描述電腦問題';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 處理表單提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // 這裡可以調用 API 提交表單
    console.log('提交表單資料:', {
      ...formData,
      photos: formData.photos.map(f => f.name)
    });

    // 模擬提交成功
    alert('報修單新增成功！');
    
    // 重置表單並關閉 Modal
    setFormData({
      reportNumber: '',
      repairPerson: '',
      employeeId: '',
      location: '台中',
      equipmentName: '',
      problemDescription: '',
      borrowedEquipment: '',
      photos: []
    });
    setFormErrors({});
    setIsModalOpen(false);
  };

  // 處理取消
  const handleCancel = () => {
    setFormData({
      reportNumber: '',
      repairPerson: '',
      employeeId: '',
      location: '台中',
      equipmentName: '',
      problemDescription: '',
      borrowedEquipment: '',
      photos: []
    });
    setFormErrors({});
    setIsModalOpen(false);
  };

  // 按 ESC 鍵關閉 Modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCancel();
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  useEffect(() => {
    fetchHomeData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
              <div className={styles.kpiValue}>{String(kpi.value)}</div>
              <div className={`${styles.kpiChange} ${kpi.changeType === 'positive' ? styles.positive : styles.negative}`}>
                {kpi.change ?? '-'}
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
            <button 
              className={styles.addButton}
              onClick={() => setIsModalOpen(true)}
            >
              <i className="fas fa-plus"></i>
              <span>新增報修</span>
            </button>
          </div>
        </div>
        {isPageLoading && <div className={styles.pageState}>載入中...</div>}
        {!isPageLoading && pageError && <div className={styles.errorState}>{pageError}</div>}

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
              {paginatedOrders.map((order, index) => {
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
              {!isPageLoading && !pageError && paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={11} className={styles.emptyCell}>
                    目前沒有資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.paginationWrapper}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* 新增報修單 Modal */}
      {isModalOpen && (
        <div 
          className={styles.modalOverlay}
          onClick={handleCancel}
        >
          <div 
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>新增報修單</h3>
              <button 
                className={styles.closeButton}
                onClick={handleCancel}
                aria-label="關閉"
              >
                ×
              </button>
            </div>

            <form className={styles.modalForm} onSubmit={handleSubmit}>
              {/* 報案單號 */}
              <div className={styles.formGroup}>
                <label htmlFor="reportNumber">報案單號</label>
                <div className={styles.inputWithButton}>
                  <input
                    type="text"
                    id="reportNumber"
                    placeholder="例如: Case-2024-001"
                    value={formData.reportNumber}
                    onChange={(e) => handleInputChange('reportNumber', e.target.value)}
                    className={formErrors.reportNumber ? styles.inputError : ''}
                  />
                  <button
                    type="button"
                    className={styles.loadInfoButton}
                    onClick={handleLoadInfo}
                    disabled={isLoadingInfo}
                  >
                    <i className="fas fa-download"></i>
                    <span>{isLoadingInfo ? '載入中...' : '載入資訊'}</span>
                  </button>
                </div>
                {formErrors.reportNumber && (
                  <span className={styles.errorText}>{formErrors.reportNumber}</span>
                )}
                <p className={styles.helpText}>
                  輸入報案單號後點擊「載入資訊」從其他系統匯入電腦資訊
                </p>
              </div>

              {/* 報修人 */}
              <div className={styles.formGroup}>
                <label htmlFor="repairPerson">報修人</label>
                <input
                  type="text"
                  id="repairPerson"
                  placeholder="請輸入報修人姓名"
                  value={formData.repairPerson}
                  onChange={(e) => handleInputChange('repairPerson', e.target.value)}
                  className={formErrors.repairPerson ? styles.inputError : ''}
                />
                {formErrors.repairPerson && (
                  <span className={styles.errorText}>{formErrors.repairPerson}</span>
                )}
              </div>

              {/* 員工工號 */}
              <div className={styles.formGroup}>
                <label htmlFor="employeeId">員工工號</label>
                <input
                  type="text"
                  id="employeeId"
                  placeholder="6位數工號"
                  value={formData.employeeId}
                  onChange={(e) => handleEmployeeIdChange(e.target.value)}
                  maxLength={6}
                  className={formErrors.employeeId ? styles.inputError : ''}
                />
                {formErrors.employeeId && (
                  <span className={styles.errorText}>{formErrors.employeeId}</span>
                )}
              </div>

              {/* 地點 */}
              <div className={styles.formGroup}>
                <label htmlFor="location">地點</label>
                <select
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={formErrors.location ? styles.inputError : ''}
                >
                  <option value="台中">台中</option>
                  <option value="新竹">新竹</option>
                  <option value="高雄">高雄</option>
                  <option value="台北">台北</option>
                </select>
                {formErrors.location && (
                  <span className={styles.errorText}>{formErrors.location}</span>
                )}
              </div>

              {/* 電腦設備名稱 */}
              <div className={styles.formGroup}>
                <label htmlFor="equipmentName">電腦設備名稱</label>
                <input
                  type="text"
                  id="equipmentName"
                  placeholder="例如: Dell Latitude 5420"
                  value={formData.equipmentName}
                  onChange={(e) => handleInputChange('equipmentName', e.target.value)}
                  className={formErrors.equipmentName ? styles.inputError : ''}
                />
                {formErrors.equipmentName && (
                  <span className={styles.errorText}>{formErrors.equipmentName}</span>
                )}
              </div>

              {/* 問題描述 */}
              <div className={styles.formGroup}>
                <label htmlFor="problemDescription">問題描述</label>
                <textarea
                  id="problemDescription"
                  placeholder="請詳細描述電腦問題"
                  value={formData.problemDescription}
                  onChange={(e) => handleInputChange('problemDescription', e.target.value)}
                  rows={4}
                  className={formErrors.problemDescription ? styles.inputError : ''}
                />
                {formErrors.problemDescription && (
                  <span className={styles.errorText}>{formErrors.problemDescription}</span>
                )}
              </div>

              {/* 借用設備資訊 */}
              <div className={styles.formGroup}>
                <label htmlFor="borrowedEquipment">借用設備資訊</label>
                <input
                  type="text"
                  id="borrowedEquipment"
                  placeholder="例如: HP123"
                  value={formData.borrowedEquipment}
                  onChange={(e) => handleInputChange('borrowedEquipment', e.target.value)}
                />
              </div>

              {/* 上傳照片 */}
              <div className={styles.formGroup}>
                <label>上傳照片</label>
                <div
                  ref={uploadAreaRef}
                  className={styles.uploadArea}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    style={{ display: 'none' }}
                  />
                  <div className={styles.uploadContent}>
                    <i className="fas fa-cloud-upload-alt"></i>
                    <p>點擊或拖曳檔案到此處上傳</p>
                    <span className={styles.uploadHint}>支援 JPG、PNG、GIF 格式</span>
                  </div>
                </div>

                {/* 已上傳的照片預覽 */}
                {formData.photos.length > 0 && (
                  <div className={styles.photoPreview}>
                    {formData.photos.map((photo, index) => (
                      <div key={index} className={styles.photoItem}>
                        <img 
                          src={URL.createObjectURL(photo)} 
                          alt={`預覽 ${index + 1}`}
                          className={styles.photoThumbnail}
                        />
                        <button
                          type="button"
                          className={styles.removePhotoButton}
                          onClick={() => handleRemovePhoto(index)}
                          aria-label="移除照片"
                        >
                          ×
                        </button>
                        <span className={styles.photoName}>{photo.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 表單操作按鈕 */}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleCancel}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                >
                  確認
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HWMAHome;
