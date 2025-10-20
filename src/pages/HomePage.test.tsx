import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router'
import HomePage from './HomePage'

// Mock useAuth hook
const mockUseAuth = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  default: () => mockUseAuth()
}))

// Mock useAuthStore
const mockUseAuthStore = vi.fn()

vi.mock('../store/useAuthStore', () => ({
  default: () => mockUseAuthStore()
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
)

describe('HomePage', () => {
  beforeEach(() => {
    // 設置預設的 mock 返回值
    mockUseAuth.mockReturnValue({
      user: {
        username: '測試用戶',
        useraccount: 'testuser',
        tel: '0912-345-678',
        location: '新竹',
        authType: 'local',
        systems: [
          {
            systemName: '出勤系統',
            roles: ['使用者', '管理員']
          }
        ]
      }
    })
  })

  it('renders main title correctly', () => {
    render(<HomePage />, { wrapper: TestWrapper })
    expect(screen.getByText(/歡迎使用管理系統/)).toBeInTheDocument()
  })

  it('renders all dashboard cards', () => {
    render(<HomePage />, { wrapper: TestWrapper })
    
    // 檢查系統權限卡片
    expect(screen.getByText('系統權限')).toBeInTheDocument()
    expect(screen.getByText('出勤系統')).toBeInTheDocument()
  })

  it('displays correct statistics values', () => {
    render(<HomePage />, { wrapper: TestWrapper })
    
    // 檢查用戶信息 - 使用更具體的查詢方式
    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByText('0912-345-678')).toBeInTheDocument()
    expect(screen.getByText('新竹')).toBeInTheDocument()
    
    // 檢查問候語中的用戶名
    const greeting = screen.getByText(/早安.*測試用戶.*！/)
    expect(greeting).toBeInTheDocument()
  })

  it('has correct structure with dashboard container', () => {
    render(<HomePage />, { wrapper: TestWrapper })
    
    const title = screen.getByText(/歡迎使用管理系統/)
    expect(title.tagName).toBe('SPAN')
    
    // 檢查系統權限標題是 H2
    const sectionTitle = screen.getByRole('heading', { level: 2 })
    expect(sectionTitle).toBeInTheDocument()
  })

  it('renders all required elements', () => {
    render(<HomePage />, { wrapper: TestWrapper })
    
    // 檢查所有必要元素都存在
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(screen.getByText('出勤系統')).toBeInTheDocument()
    
    // 檢查用戶信息區域
    const userInfo = screen.getByText('testuser').closest('div')
    expect(userInfo).toBeInTheDocument()
  })
}) 