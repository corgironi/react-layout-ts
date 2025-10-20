import { create } from 'zustand';

interface UserGroup {
  auid: number;
  sitearea: string;
}

interface SystemConfigState {
  usergroup: UserGroup[];
  setUserGroup: (usergroup: UserGroup[]) => void;
  getUserGroupById: (auid: number) => UserGroup | undefined;
  getUserGroupBySiteArea: (sitearea: string) => UserGroup | undefined;
}

export const useSystemConfigStore = create<SystemConfigState>((set, get) => ({
  usergroup: [],
  
  setUserGroup: (usergroup: UserGroup[]) => {
    set({ usergroup });
  },
  
  getUserGroupById: (auid: number) => {
    const { usergroup } = get();
    return usergroup.find(group => group.auid === auid);
  },
  
  getUserGroupBySiteArea: (sitearea: string) => {
    const { usergroup } = get();
    return usergroup.find(group => group.sitearea === sitearea);
  }
}));

export default useSystemConfigStore; 