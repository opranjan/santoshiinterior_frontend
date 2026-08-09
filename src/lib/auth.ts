const ACCESS_TOKEN_KEY = "crm_access_token";
const REFRESH_TOKEN_KEY = "crm_refresh_token";
const USER_KEY = "crm_user";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  roleLabel?: string | null;
  dateOfBirth?: string | null;
  managerId?: string | null;
  manager?: { id: string; name: string } | null;
  accessRoleId?: string | null;
  accessRole?: {
    id: string;
    key: string;
    label: string;
    isGlobal: boolean;
    baseRole: string;
    permissions?: string[];
  } | null;
  storeId?: string | null;
  isActive?: boolean;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  store?: { id: string; name: string; code: string } | null;
};

export const tokenStorage = {
  getAccessToken: () =>
    typeof window === "undefined" ? null : localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () =>
    typeof window === "undefined" ? null : localStorage.getItem(REFRESH_TOKEN_KEY),
  getUser: (): AuthUser | null => {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
  setSession: (accessToken: string, refreshToken: string, user: AuthUser) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
