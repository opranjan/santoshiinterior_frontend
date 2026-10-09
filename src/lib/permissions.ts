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
    "messages.send",
    "messages.view.all",
    "calls.make",
    "calls.view",
    "chat.box",
    "calendar.view",
  ],
  "finance.full": [
    "finance.manage",
    "payments.manage",
    "purchaseorders.manage",
    "vendor.payments",
    "procurement.manage",
  ],
  "reports.full": ["reports.store"],
  "sales.manage": ["sales.view", "customers.manage", "chat.box"],
  "leads.manage": ["customers.view"],
  "customers.manage": ["customers.view"],
  "projects.manage": ["projects.view"],
  "quotations.manage": ["quotations.create", "quotations.approve"],
  "settings.manage": ["settings.view", "website.manage", "integrations.manage"],
  "users.manage": ["users.view", "roles.manage"],
  "workorders.manage": ["workorders.update", "warranty.manage", "issues.manage"],
  "purchaseorders.manage": ["procurement.manage", "vendors.manage"],
  "documents.manage": ["documents.view"],
  "design.manage": ["design.view"],
  "hr.manage": ["hr.view"],
  "hr.portal": ["hr.view", "hr.manage"],
  "stores.manage": ["stores.view"],
  "vendor.chat.all": ["chat.box"],
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

export const canAccessAllStores = (user: AuthUser | null | undefined): boolean => {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return true;
  if (user.accessRole?.isGlobal) return true;
  return hasAnyPermission(user, [
    "sales.full",
    "stores.manage",
    "users.manage",
    "reports.full",
  ]);
};

/** Route prefix → any one of these permissions grants access */
export const ROUTE_PERMISSIONS: Array<{ prefix: string; permissions: string[] }> = [
  { prefix: "/", permissions: ["reports.full", "reports.store", "sales.view", "sales.manage", "sales.full"] },
  { prefix: "/stores", permissions: ["stores.manage", "stores.view", "sales.full", "reports.full", "reports.store", "users.manage"] },
  { prefix: "/sales", permissions: ["sales.full", "sales.manage", "sales.view", "leads.manage", "quotations.create", "quotations.manage"] },
  { prefix: "/communication", permissions: ["sales.full", "sales.manage", "sales.view", "leads.manage", "messages.send", "messages.view.all", "calls.make", "calls.view", "users.manage", "chat.box"] },
  { prefix: "/chat-box", permissions: ["chat.box", "vendor.chat.all", "sales.full", "sales.manage", "users.manage", "messages.send", "messages.view.all"] },
  { prefix: "/quotations", permissions: ["quotations.manage", "quotations.create", "sales.full", "sales.manage", "sales.view"] },
  { prefix: "/customers", permissions: ["customers.manage", "customers.view", "sales.full", "sales.manage", "sales.view"] },
  { prefix: "/design", permissions: ["design.manage", "design.view", "projects.view", "documents.manage", "sales.view", "sales.manage", "sales.full", "leads.manage", "vendor.portal", "franchisee.portal"] },
  { prefix: "/projects", permissions: ["projects.manage", "projects.view", "design.manage", "site.manage", "sales.full", "sales.view", "franchisee.portal", "vendor.portal"] },
  { prefix: "/work-orders", permissions: ["workorders.manage", "workorders.update", "site.manage", "projects.view"] },
  { prefix: "/purchase-orders", permissions: ["purchaseorders.manage", "finance.full", "finance.manage", "procurement.manage"] },
  {
    prefix: "/operations",
    permissions: [
      "purchaseorders.manage",
      "finance.full",
      "finance.manage",
      "projects.view",
      "projects.manage",
      "site.manage",
      "vendor.portal",
      "franchisee.portal",
      "procurement.manage",
      "vendors.manage",
    ],
  },
  { prefix: "/payments", permissions: ["payments.manage", "finance.full", "finance.manage"] },
  { prefix: "/franchisee-payments", permissions: ["payments.manage", "finance.full", "finance.manage", "vendor.payments"] },
  { prefix: "/vendor-payments", permissions: ["payments.manage", "finance.full", "finance.manage", "vendor.payments"] },
  { prefix: "/warranty-desk", permissions: ["warranty.manage", "projects.view", "workorders.manage", "workorders.update", "sales.view", "sales.manage", "sales.full"] },
  { prefix: "/customer-issues", permissions: ["issues.manage", "projects.view", "workorders.manage", "workorders.update", "sales.view", "sales.manage", "sales.full"] },
  { prefix: "/documents", permissions: ["documents.view", "documents.manage", "projects.view", "workorders.manage", "sales.view", "sales.manage", "sales.full"] },
  { prefix: "/hr", permissions: ["hr.manage", "hr.view", "hr.portal", "users.view", "users.manage"] },
  { prefix: "/calendar", permissions: ["calendar.view", "sales.view", "sales.manage", "sales.full", "projects.view", "hr.manage"] },
  { prefix: "/users", permissions: ["users.manage", "users.view", "roles.manage"] },
  { prefix: "/franchisees", permissions: ["users.manage", "users.view"] },
  { prefix: "/settings", permissions: ["settings.manage", "settings.view", "quotations.manage", "quotations.create", "website.manage", "integrations.manage"] },
];

export const canAccessRoute = (
  user: AuthUser | null | undefined,
  pathname: string
): boolean => {
  if (!user) return false;
  const path = pathname.split("?")[0] || "/";
  if (path === "/forbidden" || path === "/profile") return true;
  const vendorPanelOnly = ["/dlp-payment", "/chat"];
  const vendorPanelOk =
    path === "/" ||
    path === "/projects" ||
    (path.startsWith("/projects/") && path !== "/projects/new") ||
    path === "/payments" ||
    path === "/profile" ||
    path === "/customer-issues" ||
    path.startsWith("/customer-issues/") ||
    path === "/documents" ||
    path.startsWith("/documents/") ||
    path.startsWith("/design") ||
    path.startsWith("/operations/procurement") ||
    vendorPanelOnly.some((p) => path === p || path.startsWith(`${p}/`));
  if (isHrPanelUser(user)) {
    return (
      path === "/" ||
      path === "/profile" ||
      path === "/hr" ||
      path.startsWith("/hr/")
    );
  }
  if (isVendorPanelUser(user)) return vendorPanelOk;
  if (vendorPanelOnly.some((p) => path === p || path.startsWith(`${p}/`))) {
    return false;
  }
  if (path === "/franchisee" || path.startsWith("/franchisee/")) return false;
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
  path?: string;
  permissions?: string[];
  subItems?: NavPermissionItem[];
};

export type NavPermissionGroup = {
  name: string;
  path?: string;
  permissions?: string[];
  subItems?: NavPermissionItem[];
};

const OPERATIONS_PERMISSIONS = [
  "purchaseorders.manage",
  "finance.full",
  "finance.manage",
  "projects.view",
  "projects.manage",
  "site.manage",
  "procurement.manage",
  "vendors.manage",
];

export const NAV_ITEMS: NavPermissionGroup[] = [
  {
    name: "Dashboard",
    path: "/",
    permissions: ["reports.full", "reports.store", "sales.view", "sales.manage", "sales.full"],
  },
  {
    name: "Stores",
    permissions: ["stores.manage", "stores.view", "sales.full", "reports.full", "reports.store", "users.manage"],
    subItems: [
      { name: "All Stores", path: "/stores", permissions: ["stores.manage", "stores.view", "sales.full", "reports.full", "reports.store", "users.manage"] },
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
    name: "Communication",
    permissions: ["sales.full", "sales.manage", "sales.view", "leads.manage", "messages.send", "messages.view.all", "calls.make", "calls.view", "users.manage", "chat.box"],
    subItems: [
      {
        name: "WhatsApp",
        path: "/communication/whatsapp",
        permissions: ["sales.full", "sales.manage", "sales.view", "leads.manage", "messages.send", "messages.view.all"],
      },
      {
        name: "Telephony",
        path: "/communication/telephony",
        permissions: ["sales.full", "sales.manage", "sales.view", "leads.manage", "calls.make", "calls.view"],
      },
    ],
  },
  {
    name: "Chat Box",
    path: "/chat-box",
    permissions: ["chat.box", "vendor.chat.all", "sales.full", "sales.manage", "users.manage", "messages.send", "messages.view.all"],
  },
  {
    name: "Quotations",
    path: "/quotations",
    permissions: ["quotations.manage", "quotations.create", "sales.full", "sales.manage", "sales.view"],
  },
  {
    name: "Design",
    permissions: ["design.manage", "design.view", "projects.view", "documents.manage", "sales.view", "sales.manage", "sales.full", "leads.manage"],
    subItems: [
      { name: "Designing", path: "/design/designing", permissions: ["design.manage", "design.view", "documents.manage", "sales.view", "sales.manage", "sales.full", "leads.manage"] },
      { name: "Elevation", path: "/design/elevation", permissions: ["design.manage", "design.view", "documents.manage", "sales.view", "sales.manage", "sales.full", "leads.manage"] },
    ],
  },
  {
    name: "Projects",
    path: "/projects",
    permissions: ["projects.manage", "projects.view", "design.manage", "site.manage", "sales.full", "sales.view"],
  },
  {
    name: "Payments",
    path: "/payments",
    permissions: ["payments.manage", "finance.full", "finance.manage"],
  },
  {
    name: "Vendor Payment",
    path: "/vendor-payments",
    permissions: ["vendor.payments", "payments.manage", "finance.full", "finance.manage"],
  },
  {
    name: "Warranty Desk",
    path: "/warranty-desk",
    permissions: ["warranty.manage", "projects.view", "workorders.manage", "workorders.update", "sales.view", "sales.manage", "sales.full"],
  },
  {
    name: "Customer Issue",
    path: "/customer-issues",
    permissions: ["issues.manage", "projects.view", "workorders.manage", "workorders.update", "sales.view", "sales.manage", "sales.full"],
  },
  {
    name: "Documents",
    path: "/documents",
    permissions: ["documents.view", "documents.manage", "projects.view", "workorders.manage", "sales.view", "sales.manage", "sales.full"],
  },
  {
    name: "HR",
    path: "/hr",
    permissions: ["hr.manage", "hr.view", "users.view", "users.manage"],
  },
  {
    name: "Calendar",
    path: "/calendar",
    permissions: ["calendar.view", "sales.view", "sales.manage", "sales.full", "projects.view", "hr.manage"],
  },
  {
    name: "Admin",
    permissions: ["users.manage", "users.view", "settings.manage", "settings.view", "roles.manage"],
    subItems: [
      { name: "Users", path: "/users", permissions: ["users.manage", "users.view", "roles.manage"] },
      { name: "Vendor Panel", path: "/franchisees", permissions: ["users.manage", "users.view"] },
      { name: "HR Panel", path: "/users", permissions: ["users.manage", "users.view"] },
      { name: "Settings", path: "/settings", permissions: ["settings.manage", "settings.view", "quotations.manage"] },
    ],
  },
  {
    name: "Web & App",
    permissions: [
      "customers.manage",
      "customers.view",
      "sales.full",
      "sales.manage",
      "sales.view",
      "quotations.manage",
      "quotations.create",
      "settings.manage",
      "settings.view",
      "website.manage",
    ],
    subItems: [
      {
        name: "Customer",
        path: "/customers",
        permissions: ["customers.manage", "customers.view", "sales.full", "sales.manage", "sales.view"],
      },
      {
        name: "Catalogue",
        path: "/settings/quotations/catalogs",
        permissions: ["quotations.manage", "quotations.create", "settings.manage", "settings.view"],
      },
      {
        name: "Home Banner",
        path: "/settings/website/hero",
        permissions: ["settings.manage", "settings.view", "quotations.manage", "website.manage"],
      },
      {
        name: "Testimonials",
        path: "/settings/website/testimonials",
        permissions: ["settings.manage", "settings.view", "quotations.manage", "website.manage"],
      },
    ],
  },
];

export const OPERATIONS_NAV_ITEMS: NavPermissionGroup[] = [
  {
    name: "Procurement",
    permissions: OPERATIONS_PERMISSIONS,
    subItems: [
      {
        name: "Requests",
        path: "/operations/procurement/requests",
        permissions: OPERATIONS_PERMISSIONS,
      },
      {
        name: "RFQ",
        path: "/operations/procurement/rfq",
        permissions: OPERATIONS_PERMISSIONS,
      },
      {
        name: "Orders",
        path: "/operations/procurement/orders",
        permissions: OPERATIONS_PERMISSIONS,
      },
      {
        name: "Acceptances",
        path: "/operations/procurement/acceptances",
        permissions: OPERATIONS_PERMISSIONS,
      },
    ],
  },
  {
    name: "Vendors",
    permissions: OPERATIONS_PERMISSIONS,
    subItems: [
      {
        name: "My Vendors",
        path: "/operations/vendors",
        permissions: OPERATIONS_PERMISSIONS,
      },
    ],
  },
];

export const OTHER_NAV_ITEMS: NavPermissionGroup[] = [
  {
    name: "Integrations",
    path: "/settings/integrations",
    permissions: ["settings.manage", "settings.view", "integrations.manage"],
  },
];

const VENDOR_PANEL_PERMS = [
  "franchisee.portal",
  "vendor.portal",
  "projects.view",
  "projects.manage",
  "design.manage",
  "purchaseorders.manage",
];

export const VENDOR_NAV_ITEMS: NavPermissionGroup[] = [
  { name: "Dashboard", path: "/", permissions: VENDOR_PANEL_PERMS },
  {
    name: "Design",
    permissions: VENDOR_PANEL_PERMS,
    subItems: [
      { name: "Designing", path: "/design/designing", permissions: VENDOR_PANEL_PERMS },
      { name: "Elevation", path: "/design/elevation", permissions: VENDOR_PANEL_PERMS },
    ],
  },
  { name: "Projects", path: "/projects", permissions: VENDOR_PANEL_PERMS },
  {
    name: "Procurement",
    permissions: VENDOR_PANEL_PERMS,
    subItems: [
      { name: "Requests", path: "/operations/procurement/requests", permissions: VENDOR_PANEL_PERMS },
      { name: "Orders", path: "/operations/procurement/orders", permissions: VENDOR_PANEL_PERMS },
    ],
  },
  { name: "Payments", path: "/payments", permissions: ["payments.manage", "franchisee.portal", "vendor.portal"] },
  { name: "DLP Payment", path: "/dlp-payment", permissions: VENDOR_PANEL_PERMS },
  { name: "Chat Box", path: "/chat", permissions: VENDOR_PANEL_PERMS },
  { name: "Customer Issue", path: "/customer-issues", permissions: VENDOR_PANEL_PERMS },
  { name: "Documents", path: "/documents", permissions: ["documents.manage", "franchisee.portal", "vendor.portal"] },
  { name: "Profile Settings", path: "/profile", permissions: VENDOR_PANEL_PERMS },
];

export const FRANCHISEE_NAV_ITEMS = VENDOR_NAV_ITEMS;

const HR_PANEL_PERMS = ["hr.portal", "hr.manage", "hr.view"];

export const HR_NAV_ITEMS: NavPermissionGroup[] = [
  { name: "Dashboard", path: "/", permissions: HR_PANEL_PERMS },
  { name: "Employees", path: "/hr/employees", permissions: HR_PANEL_PERMS },
  { name: "Attendance", path: "/hr/attendance", permissions: HR_PANEL_PERMS },
  { name: "Leave Requests", path: "/hr/leaves", permissions: HR_PANEL_PERMS },
  {
    name: "Payroll",
    path: "/hr/payroll/slips",
    permissions: HR_PANEL_PERMS,
    subItems: [
      { name: "Salary Slips", path: "/hr/payroll/slips", permissions: HR_PANEL_PERMS },
    ],
  },
  { name: "Performance", path: "/hr/performance", permissions: HR_PANEL_PERMS },
  { name: "HR Policies", path: "/hr/policies", permissions: HR_PANEL_PERMS },
  { name: "Documents", path: "/hr/documents", permissions: HR_PANEL_PERMS },
  { name: "Reports", path: "/hr/reports", permissions: HR_PANEL_PERMS },
  { name: "Settings", path: "/hr/settings", permissions: HR_PANEL_PERMS },
];

const filterNavNode = (
  item: NavPermissionItem,
  user: AuthUser | null | undefined
): NavPermissionItem | null => {
  if (item.subItems?.length) {
    const subItems = item.subItems
      .map((sub) => filterNavNode(sub, user))
      .filter(Boolean) as NavPermissionItem[];
    if (!subItems.length) return null;
    return { ...item, subItems };
  }
  if (item.permissions?.length && !hasAnyPermission(user, item.permissions)) {
    return null;
  }
  return item;
};

export const filterNavItems = (
  items: NavPermissionGroup[],
  user: AuthUser | null | undefined
): NavPermissionGroup[] => {
  return items
    .map((item) => filterNavNode(item, user))
    .filter(Boolean) as NavPermissionGroup[];
};

export const isFranchiseeUser = (user: AuthUser | null | undefined) => {
  if (!user) return false;
  if (user.accessRole?.key === "VENDOR") return false;
  if (user.accessRole?.key === "FRANCHISEE") return true;
  if (/franchisee/i.test(String(user.roleLabel || ""))) return true;
  return (
    hasPermission(user, "franchisee.portal") &&
    !hasAnyPermission(user, ["sales.full", "sales.manage", "users.manage"])
  );
};

export const isVendorUser = (user: AuthUser | null | undefined) => {
  if (!user) return false;
  if (isFranchiseeUser(user)) return false;
  if (user.accessRole?.key === "VENDOR") return true;
  if (/^vendor$/i.test(String(user.accessRole?.label || ""))) return true;
  return (
    hasPermission(user, "vendor.portal") &&
    !hasAnyPermission(user, ["sales.full", "sales.manage", "users.manage"])
  );
};

export const isVendorPanelUser = (user: AuthUser | null | undefined) =>
  isFranchiseeUser(user) || isVendorUser(user);

export const isHrPanelUser = (user: AuthUser | null | undefined) => {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return false;
  if (user.accessRole?.key === "HR_PANEL") return true;
  if (user.accessRole?.key === "HR") return true;
  if (user.role === "HR") return true;
  return (
    hasPermission(user, "hr.portal") &&
    !hasAnyPermission(user, ["sales.full", "sales.manage", "users.manage"])
  );
};

export const isIsolatedShellUser = (user: AuthUser | null | undefined) =>
  isVendorPanelUser(user) || isHrPanelUser(user);

