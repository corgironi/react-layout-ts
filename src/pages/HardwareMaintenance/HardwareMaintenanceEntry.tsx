import { useSearchParams } from 'react-router';
import HWMAHome from './HWMAHome';
import HWMAREPAIREDBYCASE from './HWMAREPAIREDBYCASE';

/**
 * /hardware-maintenance
 * - 無 query：報修案例列表（HWMAHome）
 * - ?caseid=母單編號：子單管理（HWMAREPAIREDBYCASE），API 以 issued_no 對應此參數
 */
const HardwareMaintenanceEntry = () => {
  const [searchParams] = useSearchParams();
  const caseid = searchParams.get('caseid');
  if (caseid?.trim()) {
    return <HWMAREPAIREDBYCASE />;
  }
  return <HWMAHome />;
};

export default HardwareMaintenanceEntry;
