import { createBrowserRouter } from 'react-router';
import MainLayout from '../layout/MainLayout';
import HomePage from '../pages/HomePage';
import AttendancePage from '../pages/attendance/AttendancePage';
import Daily from '../pages/attendance/Daily';
import Leave from '../pages/attendance/Leave';
import Overtime from '../pages/attendance/Overtime';
import Summary from '../pages/attendance/Summary';
import HWMAHome from '../pages/HardwareMaintenance/HWMAHome';
import SystemPage from '../pages/system/SystemPage';
import CreateLocalUser from '../pages/system/CreateLocalUser';
import UserMaintenance from '../pages/system/UserMaintenance';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import ErrorPage from '../pages/ErrorPage';
import PrivateRoute from './PrivateRoute';
import CallbackSSO from '../pages/CallbackSSO';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PrivateRoute element={<MainLayout />} />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'attendance',
        element: <AttendancePage />,
        children: [
          {
            path: 'daily',
            element: <Daily />
          },
          {
            path: 'leave',
            element: <Leave />
          },
          {
            path: 'overtime',
            element: <Overtime />
          },
          {
            path: 'summary',
            element: <Summary />
          }
        ]
      },
      {
        path: 'hardware-maintenance',
        element: <HWMAHome />
      },
      {
        path: 'system',
        element: <SystemPage />,
        children: [
          {
            path: 'createuser',
            element: <CreateLocalUser />
          },
          {
            path: 'usermaintenance',
            element: <UserMaintenance />
          }
        ]
      }
    ]
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/callback-sso',
    element: <CallbackSSO />
  },
  {
    path: '/error',
    element: <ErrorPage />
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
]); 