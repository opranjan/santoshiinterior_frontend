import type { AuthUser } from "./auth";

export type PermissionItem = {
  key: string;
  label: string;
  hint: string;
};

export type PermissionGroup = {
  id: string;
  label: string;
  description: string;
  permissions: PermissionItem[];
};

export const BASE_ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "SALES", label: "Sales" },
  { value: "DESIGNER", label: "Designer" },
  { value: "SITE", label: "Site" },
  { value: "ACCOUNTS", label: "Accounts" },
  { value: "HR", label: "HR" },
  { value: "STAFF", label: "Staff" },
];

export type AccessRoleDto = {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  isGlobal: boolean;
  isSystem: boolean;
  baseRole: string;
  permissions: string[];
  userCount?: number;
};

const IMPLIES: Record<string, string[]> = {
  "sales.full": [
    "sales.manage",
    "sales.view",
    "leads.manage",
    "customers.view",
    "customers.manage",
  ],
  "finance.full": ["finance.manage", "payments.manage", "purchaseorders.manage"],
  "reports.full": ["reports.store"],
  "sales.manage": ["sales.view", "customers.manage"],
  "leads.manage": ["customers.view"],
  "customers.manage": ["customers.view"],
  "projects.manage": ["projects.view"],
  "quotations.manage": ["quotations.create", "quotations.approve"],
  "settings.manage": ["settings.view"],
  "users.manage": ["users.view"],
  "workorders.manage": ["workorders.update"],
};

const expandOne = (key: string, acc: Set<string>) => {
  if (!key || acc.has(key)) return;
  acc.add(key);
  for (const child of IMPLIES[key] || []) expandOne(child, acc);
};

export const expandPermissions = (permissions: string[] = []) => {
  const acc = new Set<string>();
  for (const key of permissions) expandOne(key, acc);
  return [...acc];
};

export const getUserPermissions = (user: AuthUser | null | undefined): string[] => {
  if (!user) return [];
  if (user.role === "SUPER_ADMIN") return ["*"];
  const raw = user.accessRole?.permissions ?? [];
  return expandPermissions(raw);
};

export const hasPermission = (
  user: AuthUser | null | undefined,
  key: string
): boolean => {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  return getUserPermissions(user).includes(key);
};

export const hasAnyPermission = (
  user: AuthUser | null | undefined,
  keys: string[]
): boolean => {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (!keys.length) return true;
  const perms = new Set(getUserPermissions(user));
  return keys.some((key) => perms.has(key));
};

/** Route prefix → any one of these permissions grants access */
export const ROUTE_PERMISSIONS: Array<{ prefix: string; permissions: string[] }> = [
  { prefix: "/", permissions: ["reports.full", "reports.store", "sales.view", "sales.manage", "sales.full"] },
  { prefix: "/stores", permissions: ["stores.manage", "sales.full", "reports.full", "reports.store", "users.manage"] },
  { prefix: "/sales", permissions: ["sales.full", "sales.manage", "sales.view", "leads.manage", "quotations.create", "quotations.manage"] },
  { prefix: "/quotations", permissions: ["quotations.manage", "quotations.create", "sales.full", "sales.manage", "sales.view"] },
  { prefix: "/customers", permissions: ["customers.manage", "customers.view", "sales.full", "sales.manage", "sales.view"] },
  { prefix: "/design", permissions: ["design.manage", "projects.view", "documents.manage"] },
  { prefix: "/projects", permissions: ["projects.manage", "projects.view", "design.manage", "site.manage", "sales.full", "sales.view"] },
  { prefix: "/work-orders", permissions: ["workorders.manage", "workorders.update", "site.manage", "projects.view"] },
  { prefix: "/purchase-orders", permissions: ["purchaseorders.manage", "finance.full", "finance.manage"] },
  { prefix: "/payments", permissions: ["payments.manage", "finance.full", "finance.manage"] },
  { prefix: "/warranty-desk", permissions: ["projects.view", "workorders.manage", "workorders.update", "sales.view", "sales.manage", "sales.full"] },
  { prefix: "/hr", permissions: ["hr.manage", "users.view", "users.manage"] },
  { prefix: "/calendar", permissions: ["sales.view", "sales.manage", "sales.full", "projects.view", "hr.manage"] },
  { prefix: "/users", permissions: ["users.manage", "users.view"] },
  { prefix: "/settings", permissions: ["settings.manage", "settings.view", "quotations.manage", "quotations.create"] },
  { prefix: "/profile", permissions: [] },
];

export const canAccessRoute = (
  user: AuthUser | null | undefined,
  pathname: string
): boolean => {
  if (!user) return false;
  const path = pathname.split("?")[0] || "/";
  if (path === "/forbidden" || path === "/profile") return true;
  if (user.role === "SUPER_ADMIN") return true;
  const match =
    ROUTE_PERMISSIONS.filter(
      (entry) =>
        entry.prefix === path ||
        (entry.prefix !== "/" && path.startsWith(`${entry.prefix}/`)) ||
        (entry.prefix === "/" && path === "/")
    ).sort((a, b) => b.prefix.length - a.prefix.length)[0] ??
    ROUTE_PERMISSIONS.find((entry) => entry.prefix === "/");

  if (!match || !match.permissions.length) return true;
  return hasAnyPermission(user, match.permissions);
};

export type NavPermissionItem = {
  name: string;
  path: string;
  permissions?: string[];
};

export type NavPermissionGroup = {
  name: string;
  path?: string;
  permissions?: string[];
  subItems?: NavPermissionItem[];
};

export const NAV_ITEMS: NavPermissionGroup[] = [
  {
    name: "Dashboard",
    path: "/",
    permissions: ["reports.full", "reports.store", "sales.view", "sales.manage", "sales.full"],
  },
  {
    name: "Stores",
    permissions: ["stores.manage", "sales.full", "reports.full", "reports.store", "users.manage"],
    subItems: [
      { name: "All Stores", path: "/stores", permissions: ["stores.manage", "sales.full", "reports.full", "reports.store", "users.manage"] },
      { name: "Add Store", path: "/stores/new", permissions: ["stores.manage"] },
    ],
  },
  {
    name: "Sales",
    permissions: ["sales.full", "sales.manage", "sales.view", "leads.manage", "quotations.create", "quotations.manage"],
    subItems: [
      { name: "Leads", path: "/sales/leads", permissions: ["sales.full", "sales.manage", "sales.view", "leads.manage"] },
      { name: "Add Lead", path: "/sales/leads/new", permissions: ["sales.full", "sales.manage", "leads.manage"] },
      { name: "Deals", path: "/sales/deals", permissions: ["sales.full", "sales.manage", "sales.view"] },
      { name: "Create Quotation", path: "/quotations?create=1", permissions: ["quotations.create", "quotations.manage", "sales.full", "sales.manage"] },
    ],
  },
  {
    name: "Quotations",
    path: "/quotations",
    permissions: ["quotations.manage", "quotations.create", "sales.full", "sales.manage", "sales.view"],
  },
  {
    name: "Customer",
    path: "/customers",
    permissions: ["customers.manage", "customers.view", "sales.full", "sales.manage", "sales.view"],
  },
  {
    name: "Design",
    permissions: ["design.manage", "projects.view", "documents.manage"],
    subItems: [
      { name: "Designing", path: "/design/designing", permissions: ["design.manage", "documents.manage"] },
      { name: "Elevation", path: "/design/elevation", permissions: ["design.manage", "documents.manage"] },
    ],
  },
  {
    name: "Projects",
    path: "/projects",
    permissions: ["projects.manage", "projects.view", "design.manage", "site.manage", "sales.full", "sales.view"],
  },
  {
    name: "Work Order",
    path: "/work-orders",
    permissions: ["workorders.manage", "workorders.update", "site.manage", "projects.view"],
  },
  {
    name: "Purchase Order",
    path: "/purchase-orders",
    permissions: ["purchaseorders.manage", "finance.full", "finance.manage"],
  },
  {
    name: "Payments",
    path: "/payments",
    permissions: ["payments.manage", "finance.full", "finance.manage"],
  },
  {
    name: "Warranty Desk",
    path: "/warranty-desk",
    permissions: ["projects.view", "workorders.manage", "workorders.update", "sales.view", "sales.manage", "sales.full"],
  },
  {
    name: "HR",
    path: "/hr",
    permissions: ["hr.manage", "users.view", "users.manage"],
  },
  {
    name: "Calendar",
    path: "/calendar",
    permissions: ["sales.view", "sales.manage", "sales.full", "projects.view", "hr.manage"],
  },
  {
    name: "Admin",
    permissions: ["users.manage", "users.view", "settings.manage", "settings.view"],
    subItems: [
      { name: "Users", path: "/users", permissions: ["users.manage", "users.view"] },
      { name: "Settings", path: "/settings", permissions: ["settings.manage", "settings.view", "quotations.manage"] },
    ],
  },
];

export const OTHER_NAV_ITEMS: NavPermissionGroup[] = [
  {
    name: "Integrations",
    path: "/settings/integrations",
    permissions: ["settings.manage", "settings.view"],
  },
];

export const filterNavItems = (
  items: NavPermissionGroup[],
  user: AuthUser | null | undefined
): NavPermissionGroup[] => {
  return items
    .map((item) => {
      if (item.subItems) {
        const subItems = item.subItems.filter((sub) =>
          !sub.permissions?.length || hasAnyPermission(user, sub.permissions)
        );
        if (!subItems.length) return null;
        return { ...item, subItems };
      }
      if (item.permissions?.length && !hasAnyPermission(user, item.permissions)) {
        return null;
      }
      return item;
    })
    .filter(Boolean) as NavPermissionGroup[];
};
