import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AttendancePage from './AttendancePage'

const mockNavigate = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  Outlet: () => <div data-testid="outlet">Outlet Content</div>
}))

describe('AttendancePage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders all page elements correctly', () => {
    render(<AttendancePage />)
    
    expect(screen.getByText('出勤管理')).toBeInTheDocument()
    expect(screen.getByText('每日出勤')).toBeInTheDocument()
    expect(screen.getByText('請假系統')).toBeInTheDocument()
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })

  it('navigates to daily page when daily tab is clicked', () => {
    render(<AttendancePage />)
    
    fireEvent.click(screen.getByText('每日出勤'))
    expect(mockNavigate).toHaveBeenCalledWith('/attendance/daily')
  })

  it('navigates to leave page when leave tab is clicked', () => {
    render(<AttendancePage />)
    
    fireEvent.click(screen.getByText('請假系統'))
    expect(mockNavigate).toHaveBeenCalledWith('/attendance/leave')
  })

  it('calls navigate function multiple times correctly', () => {
    render(<AttendancePage />)
    
    // 點擊多次測試
    fireEvent.click(screen.getByText('每日出勤'))
    fireEvent.click(screen.getByText('請假系統'))
    fireEvent.click(screen.getByText('每日出勤'))
    
    expect(mockNavigate).toHaveBeenCalledTimes(3)
    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/attendance/daily')
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/attendance/leave')
    expect(mockNavigate).toHaveBeenNthCalledWith(3, '/attendance/daily')
  })

  it('renders outlet content correctly', () => {
    render(<AttendancePage />)
    expect(screen.getByTestId('outlet')).toHaveTextContent('Outlet Content')
  })

  it('has correct button elements', () => {
    render(<AttendancePage />)
    
    const dailyButton = screen.getByText('每日出勤').closest('button')
    const leaveButton = screen.getByText('請假系統').closest('button')
    
    expect(dailyButton).toBeInTheDocument()
    expect(leaveButton).toBeInTheDocument()
  })

  it('handles tab switching state management', () => {
    render(<AttendancePage />)
    
    // 測試標籤切換邏輯
    fireEvent.click(screen.getByText('請假系統'))
    expect(mockNavigate).toHaveBeenCalledWith('/attendance/leave')
    
    fireEvent.click(screen.getByText('每日出勤'))
    expect(mockNavigate).toHaveBeenCalledWith('/attendance/daily')
  })
}) 