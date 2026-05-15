import { useLocation } from 'react-router';
import useAuthStore from '../store/useAuthStore';
import PermissionDenied from '../pages/PermissionDenied';
import {
  canAccessHardwareMaintenancePath,
  getHardwareMaintenanceSystem,
  isSystemShellVisible,
} from '../lib/systemPermissions';

interface HardwareMaintenanceGuardProps {
  children: React.ReactNode;
}

/**
 * 依 user.systems 內 hardware-maintenance 的 visible / needVerify（及可選 role）決定是否渲染子頁。
 */
const HardwareMaintenanceGuard = ({ children }: HardwareMaintenanceGuardProps) => {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const sys = getHardwareMaintenanceSystem(user?.systems);
  if (!sys) {
    return <PermissionDenied />;
  }
  if (!isSystemShellVisible(sys)) {
    return <PermissionDenied />;
  }

  if (!canAccessHardwareMaintenancePath(user?.systems, location.pathname)) {
    return <PermissionDenied />;
  }

  return <>{children}</>;
};

export default HardwareMaintenanceGuard;
