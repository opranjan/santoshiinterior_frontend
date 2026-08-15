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
  _count?: {
    leads?: number;
    projects?: number;
    users?: number;
    quotations?: number;
  };
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
  quotations?: Array<{ id: string }>;
  _count?: { quotations: number };
  project?: { id: string; name: string } | null;
};

export type LeadQuotationSummaryBucket = {
  count: number;
  amount: number;
};

export type LeadMessageDto = {
  id: string;
  leadId: string;
  direction: "INBOUND" | "OUTBOUND";
  channel: string;
  body?: string | null;
  templateName?: string | null;
  mediaUrl?: string | null;
  externalId?: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  sentBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadWorkspaceDto = {
  lead: LeadDto;
  quotations: Array<{
    id: string;
    title: string;
    status: string;
    amount: number | string;
    version: number;
    createdAt: string;
    updatedAt: string;
    clientName: string;
  }>;
  quotationSummary: {
    total: LeadQuotationSummaryBucket;
    internalPending: LeadQuotationSummaryBucket;
    clientNegotiation: LeadQuotationSummaryBucket;
    clientAccepted: LeadQuotationSummaryBucket;
  };
  followUps: NonNullable<LeadDto["followUps"]>;
  messages?: LeadMessageDto[];
  counts: {
    quotations: number;
    followUps: number;
    deals: number;
  };
};

export const leadsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<LeadDto>>("/leads", query),
  get: (id: string) => api.get<LeadDto>(`/leads/${id}`),
  getWorkspace: (id: string) =>
    api.get<LeadWorkspaceDto>(`/leads/${id}/workspace`),
  create: (body: Record<string, unknown>) => api.post<LeadDto>("/leads", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<LeadDto>(`/leads/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/leads/${id}`),
  addFollowUp: (id: string, body: Record<string, unknown>) =>
    api.post(`/leads/${id}/follow-ups`, body),
  bulkUpdate: (body: {
    leadIds: string[];
    action: string;
    assigneeIds?: string[];
    status?: string;
    source?: string;
    projectType?: string;
  }) => api.post<{ updated: number }>("/leads/bulk", body),
  bulkDelete: (leadIds: string[]) =>
    api.post<{ updated: number }>("/leads/bulk", {
      leadIds,
      action: "DELETE",
    }),
  convertToProject: (
    id: string,
    payload: { projectId?: string; projectName?: string }
  ) =>
    api.post<{ project: { id: string; name: string }; lead: LeadDto }>(
      `/leads/${id}/convert-to-project`,
      payload
    ),
  listMessages: (id: string) =>
    api.get<LeadMessageDto[]>(`/leads/${id}/messages`),
  sendMessage: (id: string, body: { body?: string; templateName?: string; bodyValues?: string[] }) =>
    api.post<LeadMessageDto>(`/leads/${id}/messages`, body),
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
    quotationsSent: number;
    revenueCollected: number | string;
    revenueThisMonth: number | string;
    pendingPayments: number | string;
    pendingPaymentCount: number;
    warrantyOpen: number;
    warrantyOverdue: number;
  };
  pipeline: Array<{ stage: string; count: number }>;
  storePerformance: Array<{
    id: string;
    store: string;
    city: string;
    leads: number;
    projects: number;
    revenue: number;
    conversion: string;
  }>;
  followUpsDue: Array<{
    id: string;
    leadId: string;
    client: string;
    store: string;
    type: string;
    when: string;
    overdue: boolean;
  }>;
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
  recentQuotations: Array<{
    id: string;
    title: string;
    client: string;
    amount: number;
    status: string;
    store?: { id: string; name: string } | null;
    createdAt: string;
  }>;
};

export const dashboardApi = {
  get: (storeId?: string) =>
    api.get<DashboardDto>("/dashboard", storeId ? { storeId } : undefined),
};

export type DesignGenerationDto = {
  id: string;
  mode: "designing" | "elevation";
  style: string;
  scope: string;
  userPrompt?: string | null;
  enrichedPrompt?: string | null;
  analysis?: string | null;
  sourceImageUrl?: string | null;
  sourceImageUrls?: string[] | null;
  resultImageUrl: string;
  createdAt: string;
};

export const designApi = {
  history: () => api.get<DesignGenerationDto[]>("/design/history"),
  generate: async (payload: {
    mode: "designing" | "elevation";
    style?: string;
    scope?: string;
    prompt?: string;
    images: File[];
  }) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    form.append("mode", payload.mode);
    if (payload.style?.trim()) form.append("style", payload.style.trim());
    if (payload.scope?.trim()) form.append("scope", payload.scope.trim());
    if (payload.prompt?.trim()) form.append("prompt", payload.prompt.trim());
    payload.images.forEach((file) => form.append("image", file));

    const res = await fetch(`${base}/design/generate`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(
        json?.error?.message || json?.message || "Image generation failed"
      );
    }
    return json.data as DesignGenerationDto;
  },
  download: async (id: string, mode: "designing" | "elevation") => {
    const { tokenStorage } = await import("@/lib/auth");
    const { downloadDesignAsset } = await import("@/lib/designAssets");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const fallback = `${mode}-${id.slice(0, 8)}.png`;
    await downloadDesignAsset(
      `${base}/design/${id}/download`,
      fallback,
      token ? { Authorization: `Bearer ${token}` } : undefined
    );
  },
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
  get: (id: string) => api.get<Record<string, unknown>>(`/quotations/${id}`),
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
  listRoles: () =>
    api.get<
      Array<{
        key: string;
        label: string;
        global: boolean;
        description: string;
        permissions: string[];
      }>
    >("/users/roles"),
  listGroups: () =>
    api.get<{
      stores: Array<{
        id: string;
        name: string;
        code: string;
        _count: { users: number };
      }>;
      unassignedActiveUsers: number;
    }>("/users/groups"),
  create: (body: Record<string, unknown>) =>
    api.post<AuthUser>("/users", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<AuthUser>(`/users/${id}`, body),
  deactivate: (id: string) => api.patch<AuthUser>(`/users/${id}/deactivate`),
  activate: (id: string) => api.patch<AuthUser>(`/users/${id}/activate`),
  remove: (id: string) => api.delete<{ id: string }>(`/users/${id}`),
};

export const rolesApi = {
  listPermissions: () =>
    api.get<
      Array<{
        id: string;
        label: string;
        description: string;
        permissions: Array<{ key: string; label: string; hint: string }>;
      }>
    >("/roles/permissions/catalog"),
  list: () => api.get<import("@/lib/permissions").AccessRoleDto[]>("/roles"),
  get: (id: string) =>
    api.get<import("@/lib/permissions").AccessRoleDto>(`/roles/${id}`),
  create: (body: Record<string, unknown>) =>
    api.post<import("@/lib/permissions").AccessRoleDto>("/roles", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<import("@/lib/permissions").AccessRoleDto>(`/roles/${id}`, body),
  duplicate: (id: string) =>
    api.post<import("@/lib/permissions").AccessRoleDto>(
      `/roles/${id}/duplicate`
    ),
  remove: (id: string) => api.delete<{ id: string }>(`/roles/${id}`),
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
  getByKey: (key: string) =>
    api.get<SettingDto>(`/settings/key/${encodeURIComponent(key)}`),
  upsertByKey: (key: string, value: unknown) =>
    api.put<SettingDto>(`/settings/key/${encodeURIComponent(key)}`, { value }),
  remove: (id: string) => api.delete<{ id: string }>(`/settings/${id}`),
  /** @deprecated Prefer quotationCatalogsApi.getBundle — still backed by relational DB */
  getQuotationCatalogs: () =>
    api.get<SettingDto>("/settings/quotation-catalogs"),
  /** @deprecated Prefer quotationCatalogsApi.saveBundle */
  saveQuotationCatalogs: (value: unknown) =>
    api.put<SettingDto>("/settings/quotation-catalogs", { value }),
  getQuotationSettings: () =>
    api.get<SettingDto>("/settings/quotation-settings"),
  /** @deprecated Prefer quotationSettingsApi.saveProfile */
  saveQuotationSettings: (value: unknown) =>
    api.put<SettingDto>("/settings/quotation-settings", { value }),
};

export type QuotationCatalogBundle = {
  catalogs: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  uoms: Array<Record<string, unknown>>;
};

export const quotationCatalogsApi = {
  getBundle: () =>
    api.get<QuotationCatalogBundle>("/quotation-catalogs/bundle"),
  saveBundle: (value: unknown) =>
    api.put<QuotationCatalogBundle>("/quotation-catalogs/bundle", value),
  get: (id: string) =>
    api.get<Record<string, unknown>>(`/quotation-catalogs/${id}`),
  create: (body: unknown) =>
    api.post<Record<string, unknown>>("/quotation-catalogs", body),
  update: (id: string, body: unknown) =>
    api.put<Record<string, unknown>>(`/quotation-catalogs/${id}`, body),
  remove: (id: string) =>
    api.delete<{ id: string; deletedItems?: number; catalogName?: string }>(
      `/quotation-catalogs/${id}`
    ),
  createCategory: (body: unknown) =>
    api.post<Record<string, unknown>>("/quotation-catalogs/categories", body),
  updateCategory: (id: string, body: unknown) =>
    api.put<Record<string, unknown>>(
      `/quotation-catalogs/categories/${id}`,
      body
    ),
  removeCategory: (id: string) =>
    api.delete<{ id: string }>(`/quotation-catalogs/categories/${id}`),
  createUom: (body: unknown) =>
    api.post<Record<string, unknown>>("/quotation-catalogs/uoms", body),
  updateUom: (id: string, body: unknown) =>
    api.put<Record<string, unknown>>(`/quotation-catalogs/uoms/${id}`, body),
  removeUom: (id: string) =>
    api.delete<{ id: string }>(`/quotation-catalogs/uoms/${id}`),
  saveItem: (catalogId: string, body: unknown) =>
    api.post<Record<string, unknown>>(
      `/quotation-catalogs/${catalogId}/items`,
      body
    ),
  deleteItem: (catalogId: string, itemId: string) =>
    api.delete<{ id: string }>(
      `/quotation-catalogs/${catalogId}/items/${itemId}`
    ),
};

export type QuotationTemplateDto = {
  id: string;
  name: string;
  font: string;
  colours: string[];
  isDefault?: boolean;
  watermarkUrl?: string | null;
  layout?: unknown[];
};

export type QuotationTemplateDetailDto = QuotationTemplateDto & {
  watermarkUrl: string | null;
  layout: unknown[];
};

export type QuotationSettingsBundle = {
  templates: QuotationTemplateDto[];
  config: Record<string, unknown>;
  modular: Record<string, unknown>;
  approval: Record<string, unknown>;
};

export const quotationSettingsApi = {
  getBundle: () =>
    api.get<QuotationSettingsBundle>("/quotation-settings/bundle"),
  saveProfile: (body: {
    config?: Record<string, unknown>;
    modular?: Record<string, unknown>;
    approval?: Record<string, unknown>;
  }) => api.put<QuotationSettingsBundle>("/quotation-settings/bundle", body),
  createTemplate: (body: {
    name: string;
    font?: string;
    colours?: string[];
    isDefault?: boolean;
  }) =>
    api.post<QuotationTemplateDto>("/quotation-settings/templates", body),
  updateTemplate: (
    id: string,
    body: {
      name?: string;
      font?: string;
      colours?: string[];
      isDefault?: boolean;
    }
  ) =>
    api.put<QuotationTemplateDto>(`/quotation-settings/templates/${id}`, body),
  setDefaultTemplate: (id: string) =>
    api.put<QuotationTemplateDto>(
      `/quotation-settings/templates/${id}/default`,
      {}
    ),
  deleteTemplate: (id: string) =>
    api.delete<{ id: string; message?: string }>(
      `/quotation-settings/templates/${id}`
    ),
  getTemplate: (id: string) =>
    api.get<QuotationTemplateDetailDto>(`/quotation-settings/templates/${id}`),
  updateTemplateDesign: (
    id: string,
    body: {
      name?: string;
      font?: string;
      colours?: string[];
      layout?: unknown[];
      watermarkUrl?: string | null;
    }
  ) =>
    api.put<QuotationTemplateDetailDto>(
      `/quotation-settings/templates/${id}/design`,
      body
    ),
  uploadWatermark: async (id: string, file: File) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    form.append("watermark", file);
    const res = await fetch(
      `${base}/quotation-settings/templates/${id}/watermark`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }
    );
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(payload?.error?.message || payload?.message || "Upload failed");
    }
    return payload.data as QuotationTemplateDetailDto;
  },
  removeWatermark: (id: string) =>
    api.delete<QuotationTemplateDetailDto>(
      `/quotation-settings/templates/${id}/watermark`
    ),
};
