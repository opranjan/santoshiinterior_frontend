/**
 * Shared helpers for mapping CRM API DTOs into UI table shapes.
 */
import type {
  Quotation,
  QuotationStatus,
} from "@/components/quotations/QuotationsTable";
import { enumToLabel, formatDate, materialCategoryToLabel, paymentMethodToLabel, warrantyTypeToLabel } from "@/lib/mappers";

const QUOTATION_STATUSES: QuotationStatus[] = [
  "Draft",
  "Sent",
  "Viewed",
  "Accepted",
  "Rejected",
  "Revised",
  "Expired",
];

function toQuotationStatus(value: string): QuotationStatus {
  const label = enumToLabel(value);
  return QUOTATION_STATUSES.includes(label as QuotationStatus)
    ? (label as QuotationStatus)
    : "Draft";
}

export function mapStoreName(
  store?: { name?: string } | null
): string {
  return store?.name || "";
}

export function mapUserName(
  user?: { name?: string } | null
): string {
  return user?.name || "";
}

export function toIsoDateOrNull(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  return value;
}

export function mapQuotation(dto: Record<string, unknown>): Quotation {
  const store = dto.store as { name?: string } | null | undefined;
  const createdBy = dto.createdBy as { name?: string } | null | undefined;
  return {
    id: String(dto.id),
    title: String(dto.title || ""),
    sourceType: (String(dto.sourceType || "LEAD") === "CLIENT"
      ? "Client"
      : "Lead") as Quotation["sourceType"],
    sourceId: String(dto.leadId || dto.customerId || ""),
    clientName: String(dto.clientName || ""),
    phone: String(dto.phone || ""),
    email: String(dto.email || ""),
    store: mapStoreName(store),
    projectType: String(dto.projectType || ""),
    amount: Number(dto.amount || 0),
    status: toQuotationStatus(String(dto.status || "DRAFT")),
    validTill: formatDate(dto.validTill as string | null),
    createdAt: formatDate(dto.createdAt as string | null),
    updatedAt: formatDate(
      (dto.updatedAt as string | null) || (dto.createdAt as string | null)
    ),
    createdBy: mapUserName(createdBy),
    version: Number(dto.version || 1),
    itemCount: Array.isArray(dto.items)
      ? dto.items.length
      : Number(dto.itemCount || 0),
    isModular:
      Boolean(dto.isModular) ||
      String(dto.projectType || "")
        .toLowerCase()
        .includes("modular") ||
      String(dto.notes || "")
        .toLowerCase()
        .includes("modular"),
  };
}

export function mapWorkOrder(dto: Record<string, unknown>) {
  const store = dto.store as { name?: string } | null | undefined;
  const project = dto.project as
    | { id?: string; name?: string; clientName?: string }
    | null
    | undefined;
  const assignedTo = dto.assignedTo as { name?: string } | null | undefined;
  const supervisor = dto.supervisor as { name?: string } | null | undefined;
  return {
    id: String(dto.id),
    title: String(dto.title || ""),
    projectId: String(project?.id || dto.projectId || ""),
    projectName: String(project?.name || ""),
    client: String(project?.clientName || ""),
    store: mapStoreName(store),
    category: enumToLabel(String(dto.category || "OTHER")),
    priority: enumToLabel(String(dto.priority || "MEDIUM")),
    status: enumToLabel(String(dto.status || "DRAFT")),
    progress: Number(dto.progress || 0),
    assignedTo: mapUserName(assignedTo),
    supervisor: mapUserName(supervisor),
    startDate: formatDate(dto.startDate as string | null),
    dueDate: formatDate(dto.dueDate as string | null),
    completedDate: formatDate(dto.completedDate as string | null),
    siteAddress: String(dto.siteAddress || ""),
    instructions: String(dto.instructions || ""),
    remark: String(dto.remark || ""),
    createdAt: formatDate(dto.createdAt as string | null),
  };
}

export function mapPayment(dto: Record<string, unknown>) {
  const store = dto.store as { name?: string } | null | undefined;
  const project = dto.project as
    | { id?: string; name?: string; clientName?: string }
    | null
    | undefined;
  return {
    id: String(dto.id),
    invoiceNo: String(dto.invoiceNo || ""),
    projectId: String(project?.id || dto.projectId || ""),
    projectName: String(project?.name || ""),
    client: String(dto.clientName || project?.clientName || ""),
    store: mapStoreName(store),
    type: enumToLabel(String(dto.type || "ADVANCE")),
    method: paymentMethodToLabel(String(dto.method || "UPI")),
    amount: Number(dto.amount || 0),
    paidAmount: Number(dto.paidAmount || 0),
    dueDate: formatDate(dto.dueDate as string | null),
    paidDate: formatDate(dto.paidDate as string | null),
    status: enumToLabel(String(dto.status || "PENDING")),
    remark: String(dto.remark || ""),
    createdAt: formatDate(dto.createdAt as string | null),
  };
}

export function mapPurchaseOrder(dto: Record<string, unknown>) {
  const store = dto.store as { name?: string } | null | undefined;
  const project = dto.project as
    | { id?: string; name?: string }
    | null
    | undefined;
  const items = Array.isArray(dto.items)
    ? (dto.items as Array<Record<string, unknown>>).map((i) => ({
        name: String(i.name || ""),
        qty: Number(i.qty || 0),
        unit: String(i.unit || ""),
        rate: Number(i.rate || 0),
      }))
    : [];
  return {
    id: String(dto.id),
    vendor: String(dto.vendor || ""),
    projectId: String(project?.id || dto.projectId || ""),
    projectName: String(project?.name || ""),
    store: mapStoreName(store),
    category: materialCategoryToLabel(String(dto.category || "OTHER")),
    status: enumToLabel(String(dto.status || "DRAFT")),
    items,
    amount: Number(dto.amount || 0),
    paidAmount: Number(dto.paidAmount || 0),
    orderDate: formatDate(dto.orderDate as string | null),
    expectedDate: formatDate(dto.expectedDate as string | null),
    receivedDate: formatDate(dto.receivedDate as string | null),
    remark: String(dto.remark || ""),
    createdAt: formatDate(dto.createdAt as string | null),
  };
}

export function mapWarranty(dto: Record<string, unknown>) {
  const store = dto.store as { name?: string } | null | undefined;
  const project = dto.project as
    | { id?: string; name?: string }
    | null
    | undefined;
  const assignedTo = dto.assignedTo as { name?: string } | null | undefined;
  return {
    id: String(dto.id),
    subject: String(dto.subject || ""),
    type: warrantyTypeToLabel(String(dto.type || "COMPLAINT")),
    priority: enumToLabel(String(dto.priority || "MEDIUM")),
    status: enumToLabel(String(dto.status || "OPEN")),
    projectId: String(project?.id || dto.projectId || ""),
    projectName: String(project?.name || ""),
    client: String(dto.clientName || ""),
    phone: String(dto.phone || ""),
    store: mapStoreName(store),
    warrantyUntil: formatDate(dto.warrantyUntil as string | null),
    assignedTo: mapUserName(assignedTo),
    openedAt: formatDate(dto.openedAt as string | null),
    dueDate: formatDate(dto.dueDate as string | null),
    resolvedAt: formatDate(dto.resolvedAt as string | null),
    issue: String(dto.issue || ""),
    resolution: String(dto.resolution || ""),
  };
}

export function mapEmployee(dto: Record<string, unknown>) {
  const store = dto.store as { name?: string } | null | undefined;
  return {
    id: String(dto.id),
    name: String(dto.name || ""),
    email: String(dto.email || ""),
    phone: String(dto.phone || ""),
    department: enumToLabel(String(dto.department || "SALES")),
    role: String(dto.roleTitle || ""),
    store: mapStoreName(store),
    joinDate: formatDate(dto.joinDate as string | null),
    status: enumToLabel(String(dto.status || "ACTIVE")),
  };
}

export function mapLeave(dto: Record<string, unknown>) {
  const employee = dto.employee as
    | { id?: string; name?: string }
    | null
    | undefined;
  return {
    id: String(dto.id),
    employeeId: String(employee?.id || dto.employeeId || ""),
    name: String(employee?.name || ""),
    type: String(dto.type || ""),
    from: formatDate(dto.fromDate as string | null),
    to: formatDate(dto.toDate as string | null),
    days: Number(dto.days || 1),
    reason: String(dto.reason || ""),
    status: enumToLabel(String(dto.status || "PENDING")),
  };
}
