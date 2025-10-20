import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ErrorPage from './ErrorPage'

const mockNavigate = vi.fn()
const mockLocation = {
  state: {
    errorCode: 'E001',
    errorMessage: '系統發生錯誤',
    errorDetails: '詳細錯誤資訊'
  }
}

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  }
})

describe('ErrorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders error page title', () => {
    render(<ErrorPage />)
    expect(screen.getByText('系統錯誤')).toBeInTheDocument()
  })

  it('displays error code when provided', () => {
    render(<ErrorPage />)
    expect(screen.getByText('錯誤代碼: E001')).toBeInTheDocument()
  })

  it('displays error message when provided', () => {
    render(<ErrorPage />)
    expect(screen.getByText('系統發生錯誤')).toBeInTheDocument()
  })

  it('displays error details when provided', () => {
    render(<ErrorPage />)
    expect(screen.getByText('詳細錯誤資訊')).toBeInTheDocument()
  })

  it('renders back button', () => {
    render(<ErrorPage />)
    expect(screen.getByRole('button', { name: '返回登入頁面' })).toBeInTheDocument()
  })

  it('navigates to login page when back button is clicked', () => {
    render(<ErrorPage />)
    
    const backButton = screen.getByRole('button', { name: '返回登入頁面' })
    fireEvent.click(backButton)
    
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('has correct title structure', () => {
    render(<ErrorPage />)
    
    const title = screen.getByText('系統錯誤')
    expect(title.tagName).toBe('H1')
  })

  it('renders basic error page structure', () => {
    render(<ErrorPage />)
    
    expect(screen.getByText('系統錯誤')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '返回登入頁面' })).toBeInTheDocument()
  })

  it('displays all components when error state is available', () => {
    render(<ErrorPage />)
    
    // 檢查所有預期的元素都存在
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
}) 