/**
 * API 聚合匯出（向後相容）
 * 實作已拆至：client、auth、attendance、user、hwma
 * 呼叫端可持續使用 `import { hardwareMaintenanceAPI } from '../api/api'` 等路徑。
 */
export {
  default,
  api,
  refreshApi,
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from './client';

export { authAPI } from './auth';
export { attendanceAPI, overtimeAPI, getSameEmployers, getUserGroup } from './attendance';
export { userAPI } from './user';

export * from './hwma';
