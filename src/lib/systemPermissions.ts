/**
 * 與後端 user profile 之 systems[] 對齊。
 * visible / needVerify 語意同 notes/router-refactor20260514.md §2.2；
 * system_sub_path 可為後端新格式：main、flow-mgt、pricebook-mgt、items-mgt，或舊版 [""] 根路徑。
 */

export interface SystemRouteRule {
  system_sub_path: string[];
  visible: string;
  needVerify: string;
  role?: string[];
  api_allow?: string[];
  api_deny?: string[];
}

export interface UserSystemEntry {
  systemName: string;
  roles: string[];
  system_visible?: string;
  system_path?: string;
  routes?: SystemRouteRule[];
}

export const isYes = (v: string | undefined): boolean => v === 'Y' || v === 'y';

/** 系統層是否顯示（未帶欄位時相容舊 profile，視為可見） */
export function isSystemShellVisible(sys: UserSystemEntry | undefined): boolean {
  if (!sys) return false;
  if (sys.system_visible === undefined || sys.system_visible === '') return true;
  return isYes(sys.system_visible);
}

export function isRouteRuleVisible(rule: SystemRouteRule | undefined): boolean {
  if (!rule) return true;
  return isYes(rule.visible);
}

export function normalizeSubPathKey(parts: string[] | undefined): string {
  if (!parts || parts.length === 0) return '';
  const joined = parts.map((p) => String(p).trim()).filter(Boolean).join('/');
  return joined;
}

export function findUserSystem(
  systems: UserSystemEntry[] | undefined,
  systemNameOrPath: string,
): UserSystemEntry | undefined {
  if (!systems?.length) return undefined;
  const key = systemNameOrPath.toLowerCase();
  return systems.find(
    (s) =>
      s.systemName?.toLowerCase() === key ||
      (s.system_path && s.system_path.toLowerCase() === key),
  );
}

export function getHardwareMaintenanceSystem(systems: UserSystemEntry[] | undefined) {
  return findUserSystem(systems, 'hardware-maintenance');
}

/** 與後端 routes[].system_sub_path 對齊的邏輯鍵 */
export type HwmaRouteSubKey = 'main' | 'flow-mgt' | 'pricebook-mgt' | 'items-mgt';

/**
 * 將目前 URL 對應到後端一筆 route 的 sub key。
 * - /hardware-maintenance → main（舊版後端用 [""] 亦視為 main）
 * - /hardware-maintenance/pricebook-mgt → pricebook-mgt
 * - /hardware-maintenance/items-mgt → items-mgt（若日後有頁面）
 * - /hardware-maintenance/:rid → flow-mgt（子單／流程頁）
 */
export function getHwmaRouteKeyFromPathname(pathname: string): HwmaRouteSubKey | '' | null {
  if (!pathname.startsWith('/hardware-maintenance')) return null;
  const tail = pathname.slice('/hardware-maintenance'.length).replace(/^\//, '');
  if (tail === '') return 'main';
  const first = tail.split('/')[0] ?? '';
  if (first === 'pricebook-mgt') return 'pricebook-mgt';
  if (first === 'items-mgt') return 'items-mgt';
  if (first === 'flow-mgt') return 'flow-mgt';
  return 'flow-mgt';
}

/** 比對後端 rule：main 與舊版空字串 sub_path 視為同義 */
export function findHwmaRouteRuleBySubKey(
  sys: UserSystemEntry | undefined,
  logicalKey: HwmaRouteSubKey | '',
): SystemRouteRule | undefined {
  if (!sys?.routes?.length) return undefined;
  const want = logicalKey === '' ? 'main' : logicalKey;
  const aliases = want === 'main' ? new Set(['main', '']) : new Set([want]);
  return sys.routes.find((r) => aliases.has(normalizeSubPathKey(r.system_sub_path)));
}

/**
 * needVerify === 'Y' 時必須有角色；若後端帶了 role 白名單（無論 needVerify），仍須命中其一才可進入。
 */
export function userPassesRouteRoles(rule: SystemRouteRule | undefined, userRoles: string[]): boolean {
  if (!rule) return true;
  const required = rule.role;
  if (required && required.length > 0) {
    const lower = userRoles.map((r) => r.toLowerCase());
    return required.some((req) => lower.includes(req.toLowerCase()));
  }
  if (isYes(rule.needVerify)) {
    return userRoles.length > 0;
  }
  return true;
}

export function canEnterHwmaRouteBySubKey(
  sys: UserSystemEntry | undefined,
  logicalKey: HwmaRouteSubKey | '',
  userRoles: string[],
): boolean {
  if (!isSystemShellVisible(sys)) return false;
  const rule = findHwmaRouteRuleBySubKey(sys, logicalKey);
  if (!rule) {
    if (sys?.routes?.length) return false;
    return true;
  }
  if (!isRouteRuleVisible(rule)) return false;
  return userPassesRouteRoles(rule, userRoles);
}

/** 直接進入某 HWMA URL 是否允許（無 routes 舊資料 → 允許） */
export function canAccessHardwareMaintenancePath(
  systems: UserSystemEntry[] | undefined,
  pathname: string,
): boolean {
  const key = getHwmaRouteKeyFromPathname(pathname);
  if (key === null) return true;
  const sys = getHardwareMaintenanceSystem(systems);
  if (!sys) return false;
  if (!sys.routes?.length) return true;
  const roles = sys.roles ?? [];
  return canEnterHwmaRouteBySubKey(sys, key, roles);
}

export function hwmaHasAnyEnterableRoute(sys: UserSystemEntry | undefined): boolean {
  if (!isSystemShellVisible(sys)) return false;
  if (!sys?.routes?.length) return true;
  const roles = sys.roles ?? [];
  return sys.routes.some(
    (r) => isRouteRuleVisible(r) && userPassesRouteRoles(r, roles),
  );
}

/** 首頁卡片預設導向：優先 main，其次 pricebook */
export function getHwmaDefaultEntryPath(sys: UserSystemEntry | undefined): string | null {
  if (!isSystemShellVisible(sys)) return null;
  if (!sys?.routes?.length) return '/hardware-maintenance';
  const roles = sys.roles ?? [];
  const mainRule = findHwmaRouteRuleBySubKey(sys, 'main');
  if (mainRule && isRouteRuleVisible(mainRule) && userPassesRouteRoles(mainRule, roles)) {
    return '/hardware-maintenance';
  }
  const pb = findHwmaRouteRuleBySubKey(sys, 'pricebook-mgt');
  if (pb && isRouteRuleVisible(pb) && userPassesRouteRoles(pb, roles)) {
    return '/hardware-maintenance/pricebook-mgt';
  }
  const flow = findHwmaRouteRuleBySubKey(sys, 'flow-mgt');
  if (flow && isRouteRuleVisible(flow) && userPassesRouteRoles(flow, roles)) {
    return '/hardware-maintenance';
  }
  return null;
}

export type HwmaNavItem = {
  subKey: HwmaRouteSubKey;
  label: string;
  iconClass: string;
  to: string;
  visible: boolean;
  disabled: boolean;
};

export function getHwmaSidebarItems(sys: UserSystemEntry | undefined): HwmaNavItem[] {
  const items: HwmaNavItem[] = [
    {
      subKey: 'main',
      label: '報修單管理',
      iconClass: 'fas fa-file-alt',
      to: '/hardware-maintenance',
      visible: true,
      disabled: false,
    },
    {
      subKey: 'pricebook-mgt',
      label: '價格手冊',
      iconClass: 'fas fa-book-open',
      to: '/hardware-maintenance/pricebook-mgt',
      visible: true,
      disabled: false,
    },
  ];

  if (!sys?.routes?.length) {
    return items;
  }

  const roles = sys.roles ?? [];
  return items.map((item) => {
    const rule = findHwmaRouteRuleBySubKey(sys, item.subKey);
    if (!rule) {
      const hasConfig = !!sys.routes?.length;
      return { ...item, visible: !hasConfig, disabled: false };
    }
    const visible = isRouteRuleVisible(rule);
    const canEnter = userPassesRouteRoles(rule, roles);
    return {
      ...item,
      visible,
      disabled: visible && !canEnter,
    };
  });
}
