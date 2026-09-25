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

export type WhatsAppInboxItemDto = {
  id: string;
  clientName: string;
  phone: string;
  status: string;
  projectId?: string | null;
  projectName?: string | null;
  projectStatus?: string | null;
  assigneeName?: string | null;
  leadOwnerName?: string | null;
  updatedAt: string;
  viewMode?: "project" | "lead";
  displayTitle?: string;
  displaySubtitle?: string;
  lastMessage?: {
    body?: string | null;
    preview?: string;
    mediaType?: string | null;
    direction?: string;
    createdAt?: string;
  } | null;
  unreadCount: number;
  hasConversation: boolean;
  hasLead?: boolean;
};

export type LeadMessageDto = {
  id: string;
  leadId: string;
  direction: "INBOUND" | "OUTBOUND";
  channel: string;
  body?: string | null;
  templateName?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "document" | "video" | "audio" | null;
  mediaFilename?: string | null;
  externalId?: string | null;
  status: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
  sentBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  warning?: string;
  rawPayload?: {
    status?: string;
    errors?: Array<{
      code?: number;
      title?: string;
      message?: string;
      error_data?: { details?: string };
    }>;
  } | null;
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
  getMessagingInbox: (query?: {
    search?: string;
    viewMode?: "project" | "lead";
    leadStatus?: string;
    projectStatus?: string;
    status?: string;
    projectId?: string;
    leadId?: string;
  }) => api.get<WhatsAppInboxItemDto[]>("/leads/messaging/inbox", query),
  sendMessage: async (
    id: string,
    payload: {
      body?: string;
      templateName?: string;
      languageCode?: string;
      bodyValues?: string[];
      useTemplate?: boolean;
      file?: File;
    }
  ) => {
    if (payload.file) {
      const { tokenStorage } = await import("@/lib/auth");
      const base = (
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
      ).replace(/\/$/, "");
      const token = tokenStorage.getAccessToken();
      const form = new FormData();
      if (payload.body?.trim()) form.append("body", payload.body.trim());
      form.append("file", payload.file);
      const res = await fetch(`${base}/leads/${id}/messages`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (!res.ok) {
        throw new Error(
          json?.error?.message || json?.message || "Failed to send attachment"
        );
      }
      return json.data as LeadMessageDto;
    }
    return api.post<LeadMessageDto>(`/leads/${id}/messages`, payload);
  },
  deleteMessage: (leadId: string, messageId: string) =>
    api.delete<{ id: string }>(`/leads/${leadId}/messages/${messageId}`),
};

export type WhatsAppStatusDto = {
  provider: string;
  environment: string;
  configured: boolean;
  webhookReady: boolean;
  appSecretSet: boolean;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  apiVersion: string;
  defaultTemplate: string | null;
  defaultLanguage: string;
  templateCheck: {
    ok: boolean;
    reason?: string;
    approvedTemplates?: string[];
  };
  approvedTemplates: Array<{
    name: string;
    language: string;
    category?: string | null;
    bodyParamCount?: number;
    headerFormat?: string | null;
    bodyText?: string | null;
    footerText?: string | null;
    buttons?: Array<{ type: string; text: string }>;
  }>;
  templatePreviewDefaults?: {
    headerImage?: string | null;
    servicesLine?: string | null;
  };
  webhookPath: string;
  recommendedWebhookUrl?: string | null;
  publicApiUrlConfigured?: boolean;
  inboundMessageCount?: number;
  webhookActivity?: {
    lastReceivedAt: string | null;
    lastProcessed: number;
    totalReceived: number;
    lastError: string | null;
  };
};

export const messagingApi = {
  getStatus: () => api.get<WhatsAppStatusDto>("/webhooks/status"),
};

export type TelephonyStatusDto = {
  provider: string;
  configured: boolean;
  sipConfigured: boolean;
  amiConfigured: boolean;
  httpConfigured: boolean;
  clickToCallReady: boolean;
  webrtcReady: boolean;
  sipHost: string | null;
  sipPort: number;
  sipDid: string | null;
  sipTrunkName: string;
  sipCodecs: string;
  sipWssUrl: string | null;
  sipUsername: string | null;
  defaultExtension: string | null;
  webhookPath: string;
  recommendedWebhookUrl?: string | null;
  publicApiUrlConfigured?: boolean;
  webhookActivity?: {
    lastReceivedAt: string | null;
    lastProcessed: number;
    totalReceived: number;
    lastError: string | null;
  };
};

export type CallLogDto = {
  id: string;
  leadId?: string | null;
  userId?: string | null;
  direction: string;
  status: string;
  fromNumber?: string | null;
  toNumber: string;
  agentExtension?: string | null;
  didNumber?: string | null;
  durationSec?: number | null;
  recordingUrl?: string | null;
  externalId?: string | null;
  provider: string;
  note?: string | null;
  startedAt: string;
  endedAt?: string | null;
  lead?: { id: string; clientName: string; phone: string } | null;
  user?: { id: string; name: string; sipExtension?: string | null } | null;
};

export const telephonyApi = {
  getStatus: () => api.get<TelephonyStatusDto>("/telephony/status"),
  listCalls: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<CallLogDto>>("/telephony/calls", query),
  clickToCall: (body: {
    to?: string;
    phone?: string;
    leadId?: string;
    extension?: string;
    note?: string;
  }) =>
    api.post<{
      call: CallLogDto;
      originate: { mode: string; dialFallback?: string; message?: string };
    }>("/telephony/calls", body),
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

export type CustomerMessageKind = "whatsapp" | "broadcast" | "marketing";

export type CustomerMessageSendResult = {
  kind: CustomerMessageKind;
  sent: number;
  failed: number;
  results: Array<{
    customerId: string;
    name: string;
    phone: string;
    ok: boolean;
    error?: string;
    templateName?: string | null;
  }>;
};

export const customersApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<CustomerDto>>("/customers", query),
  create: (body: Record<string, unknown>) =>
    api.post<CustomerDto>("/customers", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<CustomerDto>(`/customers/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/customers/${id}`),
  sendMessages: (body: {
    customerIds: string[];
    kind: CustomerMessageKind;
    body?: string;
    templateName?: string;
    languageCode?: string;
  }) => api.post<CustomerMessageSendResult>("/customers/messages", body),
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
    followUpsDueCount?: number;
  };
  view?: "sales" | "operations";
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

export type ProjectTaskDto = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  startDate?: string | null;
  dueDate?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export const projectsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/projects", query),
  create: (body: Record<string, unknown>) => api.post("/projects", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put(`/projects/${id}`, body),
  remove: (id: string) => api.delete(`/projects/${id}`),
  listTasks: (id: string) =>
    api.get<ProjectTaskDto[]>(`/projects/${id}/tasks`),
  createTask: (id: string, body: Record<string, unknown>) =>
    api.post<ProjectTaskDto>(`/projects/${id}/tasks`, body),
  updateTask: (
    id: string,
    taskId: string,
    body: Record<string, unknown>
  ) => api.put<ProjectTaskDto>(`/projects/${id}/tasks/${taskId}`, body),
  removeTask: (id: string, taskId: string) =>
    api.delete(`/projects/${id}/tasks/${taskId}`),
};

export const quotationsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<Record<string, unknown>>>("/quotations", query),
  get: (id: string) => api.get<Record<string, unknown>>(`/quotations/${id}`),
  create: (body: Record<string, unknown>) => api.post("/quotations", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put(`/quotations/${id}`, body),
  remove: (id: string) => api.delete(`/quotations/${id}`),
  uploadAsset: async (id: string, file: File) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${base}/quotations/${id}/assets`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(
        payload?.error?.message || payload?.message || "Image upload failed"
      );
    }
    return payload.data as { url: string };
  },
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

export type PurchaseOrderItemDto = {
  id?: string;
  sortOrder?: number;
  name: string;
  code?: string | null;
  hsn?: string | null;
  qty: number;
  unit?: string | null;
  rate: number;
  discountPct?: number;
  taxPct?: number;
  imageUrl?: string | null;
  receivedQty?: number;
};

export type PurchaseOrderCommentDto = {
  id: string;
  message: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
};

export type PurchaseOrderDto = {
  id: string;
  seq: number;
  code: string;
  kind: "PO" | "WO";
  title: string;
  vendor: string;
  vendorId?: string | null;
  vendorRecord?: {
    id: string;
    name: string;
    gstin?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  } | null;
  projectId?: string | null;
  project?: { id: string; name: string; address?: string | null } | null;
  orderState: string;
  paymentState: string;
  status: string;
  amount: number;
  paidAmount: number;
  orderDate?: string | null;
  expectedDate?: string | null;
  shippingAddress?: string | null;
  vendorBillingAddress?: string | null;
  paymentTerms?: string | null;
  termsAndConditions?: string | null;
  remark?: string | null;
  isAdhoc?: boolean;
  orderComplete?: boolean;
  acceptanceStatus?: "PENDING" | "PARTIAL" | "ACCEPTED";
  createdBy?: { id: string; name: string } | null;
  items?: PurchaseOrderItemDto[];
  files?: Array<{ id: string; fileName: string; fileUrl: string; kind?: string }>;
  comments?: PurchaseOrderCommentDto[];
  createdAt: string;
  updatedAt: string;
};

export const purchaseOrdersApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<PurchaseOrderDto>>("/purchase-orders", query),
  get: (id: string) => api.get<PurchaseOrderDto>(`/purchase-orders/${id}`),
  create: (body: Record<string, unknown>) => api.post<PurchaseOrderDto>("/purchase-orders", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<PurchaseOrderDto>(`/purchase-orders/${id}`, body),
  addComment: (id: string, message: string) =>
    api.post<PurchaseOrderDto>(`/purchase-orders/${id}/comments`, { message }),
  receive: (id: string, body: Record<string, unknown>) =>
    api.post<PurchaseOrderDto>(`/purchase-orders/${id}/receive`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/purchase-orders/${id}`),
  uploadFiles: async (id: string, files: File[], kind = "RECEIPT") => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    files.forEach((file) => form.append("file", file));
    form.append("kind", kind);
    const res = await fetch(`${base}/purchase-orders/${id}/files?kind=${encodeURIComponent(kind)}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || "Upload failed");
    }
    return json.data as PurchaseOrderDto;
  },
};

export type ProcurementRequestItemDto = {
  id?: string;
  sortOrder?: number;
  name: string;
  code: string;
  uom: string;
  qty: number;
  remark: string;
};

export type ProcurementRequestFileDto = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  size: number;
};

export type ProcurementRequestDto = {
  id: string;
  seq: number;
  code: string;
  name: string;
  type: "MATERIAL" | "SERVICE";
  projectId?: string | null;
  project?: { id: string; name: string; address?: string | null } | null;
  expectedDelivery?: string | null;
  stage: "PENDING" | "APPROVED" | "ORDERED" | "CANCELLED";
  reviewStatus?: "PENDING" | "APPROVED" | "REJECTED";
  isDraft?: boolean;
  readByDaizy?: boolean;
  linkedCount: number;
  notes?: string | null;
  items?: ProcurementRequestItemDto[];
  files?: ProcurementRequestFileDto[];
  createdBy?: { id: string; name: string; avatarUrl?: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

export const procurementRequestsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<ProcurementRequestDto> & { pendingReview: number }>(
      "/procurement/requests",
      query
    ),
  get: (id: string) => api.get<ProcurementRequestDto>(`/procurement/requests/${id}`),
  create: (body: Record<string, unknown>) =>
    api.post<ProcurementRequestDto>("/procurement/requests", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<ProcurementRequestDto>(`/procurement/requests/${id}`, body),
  raise: (id: string, body: Record<string, unknown>) =>
    api.post<ProcurementRequestDto>(`/procurement/requests/${id}/raise`, body),
  copy: (id: string) =>
    api.post<ProcurementRequestDto>(`/procurement/requests/${id}/copy`, {}),
  remove: (id: string) => api.delete<{ id: string }>(`/procurement/requests/${id}`),
  uploadFiles: async (id: string, files: File[]) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    files.forEach((file) => form.append("file", file));
    const res = await fetch(`${base}/procurement/requests/${id}/files`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || "Upload failed");
    }
    return json.data as ProcurementRequestDto;
  },
  removeFile: (id: string, fileId: string) =>
    api.delete<ProcurementRequestDto>(`/procurement/requests/${id}/files/${fileId}`),
};

export type RfqItemDto = {
  id?: string;
  name: string;
  code?: string;
  uom?: string;
  qty?: number;
  remark?: string;
};

export type RfqBidDto = {
  itemId: string;
  rate: number;
  amount: number;
};

export type RfqVendorRowDto = {
  id?: string;
  vendorId: string;
  vendor?: { id: string; name: string } | null;
  deliveryDate?: string | null;
  responseStatus?: string;
  lastResponseDate?: string | null;
  totalBidding?: number;
  vendorRemark?: string;
  version?: number;
  bids?: RfqBidDto[];
};

export type RfqDto = {
  id: string;
  seq: number;
  code: string;
  publicToken: string;
  name: string;
  projectId?: string | null;
  project?: { id: string; name: string } | null;
  requestId?: string | null;
  request?: { id: string; code: string; name: string } | null;
  expectedDelivery?: string | null;
  placeOfSupply?: string | null;
  remark?: string | null;
  status: "PENDING" | "ORDERED" | "CANCELLED";
  vendors?: RfqVendorRowDto[];
  items?: RfqItemDto[];
  files?: Array<{ id: string; fileName: string; fileUrl: string }>;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export const rfqApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<RfqDto>>("/procurement/rfq", query),
  get: (id: string) => api.get<RfqDto>(`/procurement/rfq/${id}`),
  getPublic: (token: string) =>
    api.get<RfqDto>(`/procurement/rfq/public/${token}`, undefined, false),
  create: (body: Record<string, unknown>) => api.post<RfqDto>("/procurement/rfq", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<RfqDto>(`/procurement/rfq/${id}`, body),
  cancel: (id: string) => api.post<RfqDto>(`/procurement/rfq/${id}/cancel`, {}),
  copy: (id: string) => api.post<RfqDto>(`/procurement/rfq/${id}/copy`, {}),
  addVendors: (id: string, vendorIds: string[]) =>
    api.post<RfqDto>(`/procurement/rfq/${id}/vendors`, { vendorIds }),
  removeVendor: (id: string, vendorId: string) =>
    api.delete<RfqDto>(`/procurement/rfq/${id}/vendors/${vendorId}`),
  fillVendor: (id: string, vendorId: string, body: Record<string, unknown>) =>
    api.post<RfqDto>(`/procurement/rfq/${id}/vendors/${vendorId}/fill`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/procurement/rfq/${id}`),
  uploadFiles: async (id: string, files: File[]) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    files.forEach((file) => form.append("file", file));
    const res = await fetch(`${base}/procurement/rfq/${id}/files`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || "Upload failed");
    }
    return json.data as RfqDto;
  },
};

export type VendorAlternateContact = {
  name: string;
  phone: string;
  email: string;
};

export type VendorDto = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  contactPerson?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  category?: string | null;
  categories?: string[] | null;
  workingModel?: string | null;
  status: string;
  gstin?: string | null;
  aadhaar?: string | null;
  pan?: string | null;
  notes?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  alternateContacts?: VendorAlternateContact[] | null;
  bankHolderName?: string | null;
  bankAccountNumber?: string | null;
  ifsc?: string | null;
  accountType?: string | null;
  branchAddress?: string | null;
  tdsSlab?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorProjectTotals = {
  estimatedExpenses: number;
  totalPayables: number;
  totalDisbursed: number;
  payableDues: number;
};

export type VendorProjectAssignment = {
  id: string;
  assignedAt: string;
  estimatedExpenses: number;
  totalPayables: number;
  totalDisbursed: number;
  payableDues: number;
  project: {
    id: string;
    name: string;
    clientName?: string | null;
    status: string;
    store?: { id: string; name: string } | null;
  };
};

export type VendorDocumentDto = {
  id: string;
  vendorId: string;
  name: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  size: number;
  createdAt: string;
};

export const vendorsApi = {
  list: (query?: Record<string, string | number | undefined>) =>
    api.get<Paginated<VendorDto>>("/vendors", query),
  filters: () =>
    api.get<{
      category: string[];
      workingModel: string[];
      country: string[];
      state: string[];
      city: string[];
      created: Array<{ value: string; label: string }>;
    }>("/vendors/filters"),
  get: (id: string) => api.get<VendorDto>(`/vendors/${id}`),
  create: (body: Record<string, unknown>) => api.post<VendorDto>("/vendors", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<VendorDto>(`/vendors/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/vendors/${id}`),
  categories: () =>
    api.get<Array<{ id: string; name: string; sortOrder: number }>>("/vendors/categories"),
  createCategory: (name: string) =>
    api.post<{ id: string; name: string; sortOrder: number }>("/vendors/categories", { name }),
  updateCategory: (id: string, name: string) =>
    api.put<{ id: string; name: string; sortOrder: number }>(`/vendors/categories/${id}`, { name }),
  reorderCategories: (ids: string[]) =>
    api.put<Array<{ id: string; name: string; sortOrder: number }>>("/vendors/categories/reorder", {
      ids,
    }),
  replaceCategory: (id: string, replaceWithId: string) =>
    api.post<{ id: string; replacedWith: string }>(`/vendors/categories/${id}/replace`, {
      replaceWithId,
    }),
  projects: (id: string) =>
    api.get<{
      vendor: VendorDto;
      items: VendorProjectAssignment[];
      totals: VendorProjectTotals;
    }>(`/vendors/${id}/projects`),
  assignProject: (id: string, projectId: string) =>
    api.post<{
      vendor: VendorDto;
      items: VendorProjectAssignment[];
      totals: VendorProjectTotals;
    }>(`/vendors/${id}/projects`, { projectId }),
  unassignProject: (id: string, projectId: string) =>
    api.delete<{
      vendor: VendorDto;
      items: VendorProjectAssignment[];
      totals: VendorProjectTotals;
    }>(`/vendors/${id}/projects/${projectId}`),
  documents: (id: string) =>
    api.get<{ vendor: VendorDto; items: VendorDocumentDto[] }>(`/vendors/${id}/documents`),
  removeDocument: (id: string, documentId: string) =>
    api.delete<{ id: string }>(`/vendors/${id}/documents/${documentId}`),
  uploadDocuments: async (id: string, files: File[], name?: string) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    files.forEach((file) => form.append("file", file));
    if (name?.trim()) form.append("name", name.trim());
    const res = await fetch(`${base}/vendors/${id}/documents`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(json?.error?.message || json?.message || "Upload failed");
    }
    return json.data as { items: VendorDocumentDto[]; created: VendorDocumentDto[] };
  },
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

export type WebsiteTestimonialDto = {
  id: string;
  review: string;
  authorName: string;
  authorRole: string;
  authorImg?: string | null;
  rating: number;
  isPublished: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

export const testimonialsApi = {
  list: () => api.get<WebsiteTestimonialDto[]>("/website-testimonials"),
  create: (body: Record<string, unknown>) =>
    api.post<WebsiteTestimonialDto>("/website-testimonials", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<WebsiteTestimonialDto>(`/website-testimonials/${id}`, body),
  remove: (id: string) =>
    api.delete<{ id: string }>(`/website-testimonials/${id}`),
  uploadImage: async (id: string, file: File) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`${base}/website-testimonials/${id}/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(
        payload?.error?.message || payload?.message || "Image upload failed"
      );
    }
    return payload.data as WebsiteTestimonialDto;
  },
  deleteImage: (id: string) =>
    api.delete<WebsiteTestimonialDto>(`/website-testimonials/${id}/image`),
};

export type WebsiteHeroBannerDto = {
  id: string;
  kind: "slide" | "side" | "promo-wide" | "promo-left" | "promo-right" | "deal" | "subscribe";
  discountText: string;
  highlightText: string;
  title: string;
  description: string;
  tag: string;
  price: number | null;
  comparePrice: number | null;
  ctaLabel: string;
  ctaHref: string;
  imageUrl?: string | null;
  isPublished: boolean;
  sortOrder: number;
};

export const heroBannersApi = {
  list: () => api.get<WebsiteHeroBannerDto[]>("/website-hero"),
  create: (body: Record<string, unknown>) =>
    api.post<WebsiteHeroBannerDto>("/website-hero", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<WebsiteHeroBannerDto>(`/website-hero/${id}`, body),
  remove: (id: string) => api.delete<{ id: string }>(`/website-hero/${id}`),
  uploadImage: async (id: string, file: File) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`${base}/website-hero/${id}/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(
        payload?.error?.message || payload?.message || "Image upload failed"
      );
    }
    return payload.data as WebsiteHeroBannerDto;
  },
  deleteImage: (id: string) =>
    api.delete<WebsiteHeroBannerDto>(`/website-hero/${id}/image`),
};

export type WebsiteSubscriberDto = {
  id: string;
  email: string;
  createdAt: string;
};

export const subscribersApi = {
  list: () => api.get<WebsiteSubscriberDto[]>("/website-subscribers"),
  remove: (id: string) =>
    api.delete<{ id: string }>(`/website-subscribers/${id}`),
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
  uploadCategoryImage: async (
    categoryId: string,
    file: File,
    subCategory?: string
  ) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    form.append("image", file);
    if (subCategory) form.append("subCategory", subCategory);
    const res = await fetch(
      `${base}/quotation-catalogs/categories/${categoryId}/image`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }
    );
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(
        payload?.error?.message || payload?.message || "Image upload failed"
      );
    }
    return payload.data as Record<string, unknown>;
  },
  deleteCategoryImage: (categoryId: string, subCategory?: string) =>
    api.delete<Record<string, unknown>>(
      `/quotation-catalogs/categories/${categoryId}/image${
        subCategory ? `?subCategory=${encodeURIComponent(subCategory)}` : ""
      }`
    ),
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
  uploadItemImage: async (catalogId: string, file: File) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    form.append("image", file);
    const res = await fetch(`${base}/quotation-catalogs/${catalogId}/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(
        payload?.error?.message || payload?.message || "Image upload failed"
      );
    }
    return payload.data as { url: string };
  },
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
  uploadAsset: async (id: string, file: File) => {
    const { tokenStorage } = await import("@/lib/auth");
    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
    ).replace(/\/$/, "");
    const token = tokenStorage.getAccessToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${base}/quotation-settings/templates/${id}/assets`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }
    );
    const text = await res.text();
    const payload = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(
        payload?.error?.message || payload?.message || "Image upload failed"
      );
    }
    return payload.data as { url: string };
  },
};
