import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Daily from './Daily'

// 使用與 Daily 組件相同的日期格式化函數
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const today = formatDate(new Date());

// Mock store hooks
const mockUseAttendanceStore = vi.fn()
const mockUseLeaveStore = vi.fn()

vi.mock('../../store/attendanceStore', () => ({
  useAttendanceStore: () => mockUseAttendanceStore()
}))

vi.mock('../../store/leaveStore', () => ({
  useLeaveStore: () => mockUseLeaveStore()
}))

// Mock components
vi.mock('../../components/Table', () => ({
  default: ({ data, loading }: any) => (
    <div data-testid="table">
      {loading ? '載入中...' : `Table with ${data?.length || 0} rows`}
    </div>
  )
}))

vi.mock('../../components/Alert', () => ({
  default: ({ isOpen, title, message, onConfirm, onCancel }: any) => (
    isOpen ? (
      <div data-testid="alert">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm}>確認</button>
        <button onClick={onCancel}>取消</button>
      </div>
    ) : null
  )
}))

describe('Daily', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // 設置預設的 mock 返回值
    mockUseAttendanceStore.mockReturnValue({
      attendanceRecords: [],
      engineers: [],
      fetchAttendanceData: vi.fn(),
      batchCheckIn: vi.fn(),
      batchCancelCheckIn: vi.fn(),
      siteCheckReports: [],
      fetchSiteCheckReport: vi.fn(),
      isLoading: false,
      error: null
    })
    
    mockUseLeaveStore.mockReturnValue({
      leaveRecords: []
    })
  })

  it('renders basic daily attendance components', () => {
    render(<Daily />)
    
    // 檢查主要UI元素
    expect(screen.getByTestId('table')).toBeInTheDocument()
    expect(screen.getByText('Table with 0 rows')).toBeInTheDocument()
  })

  it('displays loading state when loading', () => {
    mockUseAttendanceStore.mockReturnValue({
      attendanceRecords: [],
      engineers: [],
      fetchAttendanceData: vi.fn(),
      batchCheckIn: vi.fn(),
      batchCancelCheckIn: vi.fn(),
      siteCheckReports: [],
      fetchSiteCheckReport: vi.fn(),
      isLoading: true,
      error: null
    })
    
    mockUseLeaveStore.mockReturnValue({
      leaveRecords: []
    })
    
    render(<Daily />)
    expect(screen.getByText('載入中...')).toBeInTheDocument()
  })

  it('renders date input field', () => {
    render(<Daily />)
    
    const dateInput = screen.getByDisplayValue(today)
    expect(dateInput).toBeInTheDocument()
    expect(dateInput).toHaveAttribute('type', 'date')
  })

  it('renders search input field', () => {
    render(<Daily />)
    
    const searchInput = screen.getByPlaceholderText('搜尋員工...')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('type', 'text')
  })

  it('renders batch action buttons', () => {
    render(<Daily />)
    
    expect(screen.getByRole('button', { name: '一鍵打卡' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消打卡' })).toBeInTheDocument()
  })

  it('handles date change', () => {
    const mockFetchSiteCheckReport = vi.fn()
    mockUseAttendanceStore.mockReturnValue({
      attendanceRecords: [],
      engineers: [],
      fetchAttendanceData: vi.fn(),
      batchCheckIn: vi.fn(),
      batchCancelCheckIn: vi.fn(),
      siteCheckReports: [],
      fetchSiteCheckReport: mockFetchSiteCheckReport,
      isLoading: false,
      error: null
    })
    
    render(<Daily />)
    
    const dateInput = screen.getByDisplayValue(today)
    fireEvent.change(dateInput, { target: { value: '2024-01-15' } })
    
    expect(dateInput).toHaveValue('2024-01-15')
  })

  it('handles search input change', () => {
    render(<Daily />)
    
    const searchInput = screen.getByPlaceholderText('搜尋員工...')
    fireEvent.change(searchInput, { target: { value: 'test user' } })
    
    expect(searchInput).toHaveValue('test user')
  })

  it('renders select all button', () => {
    render(<Daily />)
    
    const selectAllButton = screen.getByRole('button', { name: '全選' })
    expect(selectAllButton).toBeInTheDocument()
  })

  it('handles select all button click', () => {
    render(<Daily />)
    
    const selectAllButton = screen.getByRole('button', { name: '全選' })
    fireEvent.click(selectAllButton)
    
    // 按鈕應該還是存在的
    expect(selectAllButton).toBeInTheDocument()
  })

  it('displays statistics', () => {
    render(<Daily />)
    
    expect(screen.getByText('總人數')).toBeInTheDocument()
    expect(screen.getByText('已簽到')).toBeInTheDocument()
    expect(screen.getByText('未簽到')).toBeInTheDocument()
    expect(screen.getByText('請假')).toBeInTheDocument()
  })
}) 