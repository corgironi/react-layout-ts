import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MainLayout from './MainLayout'

// Mock 子組件
vi.mock('../components/Header', () => ({
  default: ({ onToggleSidebar }: { onToggleSidebar: () => void }) => (
    <div data-testid="header">
      <button onClick={onToggleSidebar} data-testid="toggle-sidebar">
        Toggle
      </button>
    </div>
  )
}))

vi.mock('../components/Sidebar', () => ({
  default: ({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) => (
    <div data-testid="sidebar">
      <span data-testid="collapsed-state">{collapsed ? 'collapsed' : 'expanded'}</span>
      <button onClick={onCollapse} data-testid="collapse-btn">
        Collapse
      </button>
    </div>
  )
}))

vi.mock('react-router', () => ({
  Outlet: () => <div data-testid="outlet">Content</div>
}))

describe('MainLayout', () => {
  it('renders correctly with all components', () => {
    render(<MainLayout />)
    
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
    expect(screen.getByTestId('collapsed-state')).toHaveTextContent('expanded')
  })

  it('toggles sidebar via header button', () => {
    render(<MainLayout />)
    
    const toggleButton = screen.getByTestId('toggle-sidebar')
    const collapsedState = screen.getByTestId('collapsed-state')
    
    // 初始狀態：展開
    expect(collapsedState).toHaveTextContent('expanded')
    
    // 點擊切換
    fireEvent.click(toggleButton)
    expect(collapsedState).toHaveTextContent('collapsed')
    
    // 再次切換回展開
    fireEvent.click(toggleButton)
    expect(collapsedState).toHaveTextContent('expanded')
  })

  it('toggles sidebar via sidebar button', () => {
    render(<MainLayout />)
    
    const collapseButton = screen.getByTestId('collapse-btn')
    const collapsedState = screen.getByTestId('collapsed-state')
    
    // 初始狀態：展開
    expect(collapsedState).toHaveTextContent('expanded')
    
    // 通過 Sidebar 切換
    fireEvent.click(collapseButton)
    expect(collapsedState).toHaveTextContent('collapsed')
    
    // 再次切換回展開
    fireEvent.click(collapseButton)
    expect(collapsedState).toHaveTextContent('expanded')
  })

  it('maintains state consistency across multiple toggles', () => {
    render(<MainLayout />)
    
    const headerToggle = screen.getByTestId('toggle-sidebar')
    const sidebarToggle = screen.getByTestId('collapse-btn')
    const collapsedState = screen.getByTestId('collapsed-state')
    
    // 多次切換測試狀態一致性
    fireEvent.click(headerToggle) // collapsed
    expect(collapsedState).toHaveTextContent('collapsed')
    
    fireEvent.click(sidebarToggle) // expanded
    expect(collapsedState).toHaveTextContent('expanded')
    
    fireEvent.click(headerToggle) // collapsed
    expect(collapsedState).toHaveTextContent('collapsed')
  })
}) 