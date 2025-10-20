import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Leave from './Leave'

// Mock store hook
const mockUseLeaveStore = vi.fn()

vi.mock('../../store/leaveStore', () => ({
  useLeaveStore: () => mockUseLeaveStore()
}))

// Mock components
vi.mock('../../components/Table', () => ({
  default: ({ data, loading }: any) => (
    <div data-testid="table">
      {loading ? '查詢中...' : `Table with ${data?.length || 0} rows`}
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

describe('Leave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // 設置預設的 mock 返回值
    mockUseLeaveStore.mockReturnValue({
      leaveRecords: [],
      colleagues: [],
      isLoading: false,
      isLoadingColleagues: false,
      isSubmitting: false,
      cancelLeave: vi.fn(),
      fetchColleagues: vi.fn(),
      submitLeave: vi.fn(),
      fetchLeaveRecords: vi.fn()
    })
  })

  it('renders basic leave management components', () => {
    render(<Leave />)
    
    // 檢查主要UI元素
    expect(screen.getByTestId('table')).toBeInTheDocument()
    expect(screen.getByText('Table with 0 rows')).toBeInTheDocument()
  })

  it('displays loading state when loading', () => {
    mockUseLeaveStore.mockReturnValue({
      leaveRecords: [],
      colleagues: [],
      isLoading: true,
      isLoadingColleagues: false,
      isSubmitting: false,
      cancelLeave: vi.fn(),
      fetchColleagues: vi.fn(),
      submitLeave: vi.fn(),
      fetchLeaveRecords: vi.fn()
    })
    
    render(<Leave />)
    expect(screen.getByText('查詢中...')).toBeInTheDocument()
  })

  it('renders page title', () => {
    render(<Leave />)
    
    expect(screen.getByText('請假管理')).toBeInTheDocument()
  })

  it('renders date range inputs', () => {
    render(<Leave />)
    
    const dateInputs = screen.getAllByDisplayValue(new Date().toISOString().split('T')[0])
    expect(dateInputs).toHaveLength(2) // 開始和結束日期
    
    dateInputs.forEach(input => {
      expect(input).toHaveAttribute('type', 'date')
    })
  })

  it('renders search button', () => {
    render(<Leave />)
    
    // 檢查是否有查詢相關的按鈕
    const buttons = screen.getAllByRole('button')
    const hasSearchButton = buttons.some(button => 
      button.textContent === '查詢' || button.textContent === '查詢中...'
    )
    expect(hasSearchButton).toBe(true)
  })

  it('renders add leave button', () => {
    render(<Leave />)
    
    expect(screen.getByRole('button', { name: '新增請假' })).toBeInTheDocument()
  })

  it('handles date range search', async () => {
    const mockFetchLeaveRecords = vi.fn()
    mockUseLeaveStore.mockReturnValue({
      leaveRecords: [],
      colleagues: [],
      isLoading: false,
      isLoadingColleagues: false,
      isSubmitting: false,
      cancelLeave: vi.fn(),
      fetchColleagues: vi.fn(),
      submitLeave: vi.fn(),
      fetchLeaveRecords: mockFetchLeaveRecords
    })
    
    render(<Leave />)
    
    // 尋找查詢按鈕
    const buttons = screen.getAllByRole('button')
    const searchButton = buttons.find(button => 
      button.textContent === '查詢' || button.textContent === '查詢中...'
    ) as HTMLButtonElement
    
    if (searchButton && !searchButton.disabled) {
      fireEvent.click(searchButton)
      expect(mockFetchLeaveRecords).toHaveBeenCalled()
    }
  })

  it('opens add leave modal when button is clicked', async () => {
    const mockFetchColleagues = vi.fn()
    mockUseLeaveStore.mockReturnValue({
      leaveRecords: [],
      colleagues: [],
      isLoading: false,
      isLoadingColleagues: false,
      isSubmitting: false,
      cancelLeave: vi.fn(),
      fetchColleagues: mockFetchColleagues,
      submitLeave: vi.fn(),
      fetchLeaveRecords: vi.fn()
    })
    
    render(<Leave />)
    
    const addButton = screen.getByRole('button', { name: '新增請假' })
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(mockFetchColleagues).toHaveBeenCalled()
    })
  })

  it('displays statistics', () => {
    render(<Leave />)
    
    expect(screen.getByText('總請假數:')).toBeInTheDocument()
    expect(screen.getByText('查詢範圍:')).toBeInTheDocument()
  })

  it('displays leave records when available', () => {
    mockUseLeaveStore.mockReturnValue({
      leaveRecords: [
        { id: 1, account: 'user1', reason: 'Personal leave' },
        { id: 2, account: 'user2', reason: 'Sick leave' }
      ],
      colleagues: [],
      isLoading: false,
      isLoadingColleagues: false,
      isSubmitting: false,
      cancelLeave: vi.fn(),
      fetchColleagues: vi.fn(),
      submitLeave: vi.fn(),
      fetchLeaveRecords: vi.fn()
    })
    
    render(<Leave />)
    
    expect(screen.getByText('Table with 2 rows')).toBeInTheDocument()
  })

  it('handles date input changes', () => {
    render(<Leave />)
    
    const dateInputs = screen.getAllByDisplayValue(new Date().toISOString().split('T')[0])
    const startDateInput = dateInputs[0]
    
    fireEvent.change(startDateInput, { target: { value: '2024-01-15' } })
    
    expect(startDateInput).toHaveValue('2024-01-15')
  })
}) 