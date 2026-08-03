import { api } from "@/lib/api";
import type { AuthUser } from "@/lib/auth";
import type { Paginated } from "@/lib/mappers";

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }, false),
  register: (payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
  }) => api.post<AuthResponse>("/auth/register", payload, false),
  me: () => api.get<AuthUser>("/auth/me"),
};

export type StoreDto = {
  id: string;
  code: string;
  name: string;
  city: string;
  state?: string | null;
  pincode?: string | null;
  address?: string | null;
  phone: string;
  email?: string | null;
  managerId?: string | null;
  manager?: { id: string; name: string; email?: string } | null;
  gstin?: string | null;
  workingHours?: string | null;
  notes?: string | null;
  status: string;
  openedOn?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const storesApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<StoreDto>>("/stores", query),
  get: (id: string) => api.get<StoreDto>(`/stores/${id}`),
  create: (body: Record<string, unknown>) => api.post<StoreDto>("/stores", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<StoreDto>(`/stores/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/stores/${id}`),
};

export type LeadDto = {
  id: string;
  clientName: string;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  clientAddress?: string | null;
  storeId?: string | null;
  store?: { id: string; name: string; code: string } | null;
  projectName?: string | null;
  projectType?: string | null;
  scope?: string | null;
  budget?: string | null;
  source?: string | null;
  status: string;
  salesOwnerId?: string | null;
  salesOwner?: { id: string; name: string } | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  description?: string | null;
  latestRemark?: string | null;
  tentativeStart?: string | null;
  financialYear?: string | null;
  tags?: string | null;
  createdAt: string;
  updatedAt: string;
  followUps?: Array<{
    id: string;
    date: string;
    type: string;
    note?: string | null;
    by?: { id: string; name: string } | null;
    nextDate?: string | null;
    nextTime?: string | null;
  }>;
};

export const leadsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<LeadDto>>("/leads", query),
  get: (id: string) => api.get<LeadDto>(`/leads/${id}`),
  create: (body: Record<string, unknown>) => api.post<LeadDto>("/leads", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<LeadDto>(`/leads/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/leads/${id}`),
  addFollowUp: (id: string, body: Record<string, unknown>) =>
    api.post(`/leads/${id}/follow-ups`, body),
};

export type CustomerDto = {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  storeId?: string | null;
  store?: { id: string; name: string } | null;
  type: string;
  status: string;
  city?: string | null;
  address?: string | null;
  source?: string | null;
  ownerId?: string | null;
  owner?: { id: string; name: string } | null;
  tags?: string | null;
  notes?: string | null;
  lastContact?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const customersApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<CustomerDto>>("/customers", query),
  create: (body: Record<string, unknown>) =>
    api.post<CustomerDto>("/customers", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<CustomerDto>(`/customers/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/customers/${id}`),
};

export type DashboardDto = {
  summary: {
    stores: number;
    leads: number;
    openLeads: number;
    wonLeads: number;
    customers: number;
    projects: number;
    activeProjects: number;
    quotations: number;
    revenueCollected: number | string;
  };
  recentLeads: LeadDto[];
  recentProjects: Array<{
    id: string;
    name: string;
    clientName?: string | null;
    status: string;
    progress: number;
    store?: { id: string; name: string } | null;
    assignedTo?: { id: string; name: string } | null;
  }>;
};

export const dashboardApi = {
  get: (storeId?: string) =>
    api.get<DashboardDto>("/dashboard", storeId ? { storeId } : undefined),
};

export const projectsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/projects", query),
  create: (body: Record<string, unknown>) => api.post("/projects", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put(`/projects/${id}`, body),
  remove: (id: string) => api.delete(`/projects/${id}`),
};

export const quotationsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/quotations", query),
  create: (body: Record<string, unknown>) => api.post("/quotations", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put(`/quotations/${id}`, body),
  remove: (id: string) => api.delete(`/quotations/${id}`),
};

export const paymentsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/payments", query),
  create: (body: Record<string, unknown>) => api.post("/payments", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put(`/payments/${id}`, body),
  remove: (id: string) => api.delete(`/payments/${id}`),
};

export const workOrdersApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/work-orders", query),
  create: (body: Record<string, unknown>) => api.post("/work-orders", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put(`/work-orders/${id}`, body),
  remove: (id: string) => api.delete(`/work-orders/${id}`),
};

export const purchaseOrdersApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/purchase-orders", query),
  create: (body: Record<string, unknown>) => api.post("/purchase-orders", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put(`/purchase-orders/${id}`, body),
  remove: (id: string) => api.delete(`/purchase-orders/${id}`),
};

export const warrantyApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/warranty", query),
  create: (body: Record<string, unknown>) => api.post("/warranty", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put(`/warranty/${id}`, body),
  remove: (id: string) => api.delete(`/warranty/${id}`),
};

export const hrApi = {
  listEmployees: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/hr/employees", query),
  createEmployee: (body: Record<string, unknown>) =>
    api.post("/hr/employees", body),
  updateEmployee: (id: string, body: Record<string, unknown>) =>
    api.put(`/hr/employees/${id}`, body),
  removeEmployee: (id: string) => api.delete(`/hr/employees/${id}`),
  listAttendance: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/hr/attendance", query),
  upsertAttendance: (body: Record<string, unknown>) =>
    api.post("/hr/attendance", body),
  listLeaves: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/hr/leaves", query),
  createLeave: (body: Record<string, unknown>) => api.post("/hr/leaves", body),
  updateLeave: (id: string, body: Record<string, unknown>) =>
    api.put(`/hr/leaves/${id}`, body),
};

export const usersApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<AuthUser>>("/users", query),
  get: (id: string) => api.get<AuthUser>(`/users/${id}`),
  create: (body: Record<string, unknown>) =>
    api.post<AuthUser>("/users", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<AuthUser>(`/users/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/users/${id}`),
};

export type SettingDto = {
  id: string | null;
  key: string;
  value: unknown;
  exists?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const settingsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<SettingDto>>("/settings", query),
  getByKey: (key: string) => api.get<SettingDto>(`/settings/key/${encodeURIComponent(key)}`),
  upsertByKey: (key: string, value: unknown) =>
    api.put<SettingDto>(`/settings/key/${encodeURIComponent(key)}`, { value }),
  remove: (id: string) => api.delete<{ id: string }>(`/settings/${id}`),
};
