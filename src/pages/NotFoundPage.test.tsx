import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NotFoundPage from './NotFoundPage'

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  }
})

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 404 title', () => {
    render(<NotFoundPage />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('displays not found message', () => {
    render(<NotFoundPage />)
    expect(screen.getByText('抱歉，找不到您要的頁面')).toBeInTheDocument()
  })

  it('renders back to home button', () => {
    render(<NotFoundPage />)
    expect(screen.getByRole('button', { name: /返回首頁/ })).toBeInTheDocument()
  })

  it('navigates to home page when button is clicked', () => {
    render(<NotFoundPage />)
    
    const homeButton = screen.getByRole('button', { name: /返回首頁/ })
    fireEvent.click(homeButton)
    
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('has correct heading structure', () => {
    render(<NotFoundPage />)
    
    const title = screen.getByText('404')
    expect(title.tagName).toBe('H1')
  })

  it('displays all required elements', () => {
    render(<NotFoundPage />)
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText('抱歉，找不到您要的頁面')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('button contains home icon', () => {
    render(<NotFoundPage />)
    
    const button = screen.getByRole('button', { name: /返回首頁/ })
    expect(button.innerHTML).toContain('fas fa-home')
  })
}) 