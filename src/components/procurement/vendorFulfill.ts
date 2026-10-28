import {
  inventoryApi,
  purchaseOrdersApi,
  type InventoryItemDto,
  type WarehouseDto,
} from "@/services/crmApi";

export type FulfillDestination = "ORDER" | "PURCHASE" | "INVENTORY" | "PROJECT_WH";

export const FULFILL_OPTIONS: Array<{ id: FulfillDestination; label: string; hint: string }> = [
  { id: "ORDER", label: "Create order", hint: "Work order to this vendor" },
  { id: "PURCHASE", label: "Create purchase", hint: "Purchase order to this vendor" },
  { id: "INVENTORY", label: "Stock in inventory", hint: "Company warehouse stock-in" },
  { id: "PROJECT_WH", label: "Project warehouse", hint: "Stock into this project warehouse" },
];

export type FulfillLine = {
  name: string;
  code?: string | null;
  qty: number;
  unit?: string | null;
  rate: number;
  hsn?: string | null;
};

export type FulfillContext = {
  vendorId?: string | null;
  vendorName: string;
  projectId?: string | null;
  projectName?: string | null;
  projectAddress?: string | null;
  title: string;
  expectedDate?: string | null;
  remark?: string;
  source?: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function asWarehouseList(data: unknown): WarehouseDto[] {
  if (Array.isArray(data)) return data as WarehouseDto[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: WarehouseDto[] }).items;
  }
  return [];
}

async function ensureCompanyWarehouse() {
  const list = asWarehouseList(await inventoryApi.warehouses({ archived: "false", kind: "COMPANY" }));
  const existing = list.find((w) => w.kind === "COMPANY" && !w.archived);
  if (existing) return existing;
  return inventoryApi.createWarehouse({ name: "Company warehouse", kind: "COMPANY" });
}

async function ensureProjectWarehouse(projectId: string, projectName?: string | null) {
  const list = asWarehouseList(
    await inventoryApi.warehouses({ archived: "false", kind: "PROJECT", projectId })
  );
  const existing = list.find((w) => w.kind === "PROJECT" && w.projectId === projectId && !w.archived);
  if (existing) return existing;
  return inventoryApi.createWarehouse({
    name: `${projectName || "Project"} warehouse`,
    kind: "PROJECT",
    projectId,
  });
}

async function ensureInventoryItem(row: FulfillLine): Promise<InventoryItemDto> {
  const name = row.name.trim();
  const hits = await inventoryApi.searchItems(name).catch(() => [] as InventoryItemDto[]);
  const match = (hits || []).find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
  if (match) return match;
  return inventoryApi.createItem({
    name,
    itemCode: row.code || "",
    primaryUom: row.unit || "Nos",
    category: "Modular",
    goodsType: "FINISHED_GOOD",
    hsnSac: row.hsn || "",
  });
}

async function createOrder(kind: "PO" | "WO", ctx: FulfillContext, items: FulfillLine[]) {
  if (!ctx.projectId) throw new Error("Project is required.");
  if (!ctx.vendorName) throw new Error("Vendor is required.");
  const created = await purchaseOrdersApi.create({
    kind,
    title: ctx.title,
    vendor: ctx.vendorName,
    vendorId: ctx.vendorId || null,
    projectId: ctx.projectId,
    expectedDate: ctx.expectedDate || todayIso(),
    shippingAddress: ctx.projectAddress || null,
    source: ctx.source || "MODULAR_CATALOG",
    remark: ctx.remark || null,
    items: items.map((item) => ({
      name: item.name.trim(),
      code: item.code || null,
      hsn: item.hsn || null,
      qty: item.qty || 1,
      unit: item.unit || "NOS",
      rate: item.rate || 0,
    })),
  });
  return created.id;
}

async function createConfirmedStockIn(warehouse: WarehouseDto, ctx: FulfillContext, items: FulfillLine[]) {
  const stockIn = await inventoryApi.createStockIn({
    warehouseId: warehouse.id,
    kind: "PURCHASE",
    receiptDate: ctx.expectedDate || todayIso(),
    paymentMode: "Company Account",
    vendorId: ctx.vendorId || null,
    notes: ctx.remark || ctx.title,
  });
  const mapped = [];
  for (const row of items) {
    const item = await ensureInventoryItem(row);
    mapped.push({
      itemId: item.id,
      itemName: item.name,
      quantity: row.qty || 1,
      uom: row.unit || item.primaryUom || "Nos",
      unitRate: row.rate || 0,
      gstPercent: 0,
      category: item.category || "Modular",
      hsnSac: row.hsn || item.hsnSac || "",
    });
  }
  await inventoryApi.saveLines(stockIn.id, mapped);
  await inventoryApi.confirmStockIn(stockIn.id);
  return { stockInId: stockIn.id, warehouse };
}

export async function fulfillItems(dest: FulfillDestination, ctx: FulfillContext, items: FulfillLine[]) {
  const named = items.filter((row) => row.name.trim());
  if (!named.length) throw new Error("Add at least one named item.");
  if (dest === "ORDER") {
    const id = await createOrder("WO", ctx, named);
    return { message: "Work order created.", href: `/operations/procurement/orders/${id}` };
  }
  if (dest === "PURCHASE") {
    const id = await createOrder("PO", ctx, named);
    return { message: "Purchase order created.", href: `/operations/procurement/orders/${id}` };
  }
  if (dest === "INVENTORY") {
    const warehouse = await ensureCompanyWarehouse();
    const created = await createConfirmedStockIn(warehouse, ctx, named);
    return {
      message: `Stocked into ${warehouse.name}.`,
      href: `/inventory/warehouses/${created.warehouse.id}`,
    };
  }
  if (!ctx.projectId) throw new Error("Project is required for project warehouse.");
  const warehouse = await ensureProjectWarehouse(ctx.projectId, ctx.projectName);
  const created = await createConfirmedStockIn(warehouse, ctx, named);
  return {
    message: `Stocked into ${warehouse.name}.`,
    href: `/inventory/warehouses/${created.warehouse.id}`,
  };
}
