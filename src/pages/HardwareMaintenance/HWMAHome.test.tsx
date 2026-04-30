import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router';
import HWMAHome from './HWMAHome';

vi.mock('../../api/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../api/api')>();
  return {
    ...mod,
    hardwareMaintenanceAPI: {
      ...mod.hardwareMaintenanceAPI,
      getCaseServiceSites: vi.fn(() => Promise.resolve({})),
      getCaseServiceTypeBundle: vi.fn(() =>
        Promise.resolve({
          pc: [],
          monitor: [],
          parts: [],
        }),
      ),
    },
  };
});

const Wrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe('HWMAHome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders main list section', () => {
    render(<HWMAHome />, { wrapper: Wrapper });
    expect(screen.getByText('HWMA 報修案例列表')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新增報修/i })).toBeInTheDocument();
  });

  it('opens create case modal when clicking 新增報修', async () => {
    const user = userEvent.setup();
    render(<HWMAHome />, { wrapper: Wrapper });

    await user.click(screen.getByRole('button', { name: /新增報修/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /新增 HWMA 報修案例/i })).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/issued_no/i)).toBeInTheDocument();
  });
});
