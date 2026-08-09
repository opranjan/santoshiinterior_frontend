export type CrmRoleKey =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "SALES"
  | "DESIGNER"
  | "SITE"
  | "ACCOUNTS"
  | "HR"
  | "STAFF";

export type RoleDefinition = {
  key: CrmRoleKey;
  label: string;
  global: boolean;
  description: string;
  permissions: string[];
};

export const CRM_ROLES: RoleDefinition[] = [
  {
    key: "SUPER_ADMIN",
    label: "Super Admin",
    global: true,
    description: "Full system access across all stores and settings.",
    permissions: [
      "users.manage",
      "stores.manage",
      "settings.manage",
      "sales.full",
      "finance.full",
      "reports.full",
    ],
  },
  {
    key: "ADMIN",
    label: "Admin",
    global: true,
    description: "Manage users, stores, and all CRM modules.",
    permissions: [
      "users.manage",
      "stores.manage",
      "settings.view",
      "sales.full",
      "finance.full",
      "reports.full",
    ],
  },
  {
    key: "MANAGER",
    label: "Manager",
    global: false,
    description: "Manage team, leads, quotations, and projects for assigned store.",
    permissions: [
      "users.view",
      "sales.manage",
      "quotations.manage",
      "projects.manage",
      "reports.store",
    ],
  },
  {
    key: "SALES",
    label: "Sales",
    global: false,
    description: "Create and manage leads, deals, and quotations.",
    permissions: ["sales.manage", "quotations.create", "customers.view"],
  },
  {
    key: "DESIGNER",
    label: "Designer",
    global: false,
    description: "Access design modules and linked project files.",
    permissions: ["design.manage", "projects.view", "documents.manage"],
  },
  {
    key: "SITE",
    label: "Site",
    global: false,
    description: "Site visits, measurements, and work order updates.",
    permissions: ["site.manage", "workorders.update", "projects.view"],
  },
  {
    key: "ACCOUNTS",
    label: "Accounts",
    global: false,
    description: "Payments, purchase orders, and finance records.",
    permissions: ["finance.manage", "payments.manage", "purchaseorders.manage"],
  },
  {
    key: "HR",
    label: "HR",
    global: false,
    description: "Employee records, attendance, and leave management.",
    permissions: ["hr.manage", "users.view"],
  },
  {
    key: "STAFF",
    label: "Staff",
    global: false,
    description: "Basic CRM access with limited write permissions.",
    permissions: ["sales.view", "projects.view"],
  },
];

export function getRoleMeta(role?: string | null) {
  return CRM_ROLES.find((r) => r.key === role) || CRM_ROLES[CRM_ROLES.length - 1];
}

export function displayRole(role?: string | null, roleLabel?: string | null) {
  if (roleLabel?.trim()) return roleLabel.trim();
  return getRoleMeta(role).label;
}

export function isGlobalUser(role?: string | null) {
  return getRoleMeta(role).global;
}

export function formatActivityDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  return `${month} ${day}${suffix}, ${year}`;
}

export function formatDob(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${day} ${month}`;
}
