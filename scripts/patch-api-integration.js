const fs = require("fs");
const path = require("path");

const root = path.join(
  "C:/Users/omprakash ranjan/Desktop/mukesh/crm/frontend/src/components"
);

function patch(rel, replacements) {
  const file = path.join(root, rel);
  let s = fs.readFileSync(file, "utf8");
  for (const [from, to] of replacements) {
    if (!s.includes(from)) {
      console.log("MISS", rel, JSON.stringify(from).slice(0, 80));
      continue;
    }
    s = s.split(from).join(to);
    console.log("HIT", rel);
  }
  fs.writeFileSync(file, s);
}

patch("work-orders/WorkOrdersTable.tsx", [
  [
    'import React, { useMemo, useState } from "react";',
    `import React, { useEffect, useMemo, useState } from "react";
import { workOrdersApi, projectsApi, storesApi } from "@/services/crmApi";
import { labelToEnum } from "@/lib/mappers";
import { mapWorkOrder, toIsoDateOrNull } from "@/lib/crmMappers";`,
  ],
  [
    "const [orders, setOrders] = useState(initialOrders);",
    `const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [apiProjects, setApiProjects] = useState<
    Array<{ id: string; name: string; client: string; store: string; address?: string }>
  >([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [wo, projects, stores] = await Promise.all([
          workOrdersApi.list({ limit: 100 }),
          projectsApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreOptions(stores.items.map((s) => ({ id: s.id, name: s.name })));
        setApiProjects(
          projects.items.map((p) => {
            const row = p as Record<string, unknown>;
            const store = row.store as { name?: string } | null;
            return {
              id: String(row.id),
              name: String(row.name || ""),
              client: String(row.clientName || ""),
              store: store?.name || "",
              address: String(row.address || ""),
            };
          })
        );
        setOrders(
          wo.items.map((i) => mapWorkOrder(i as Record<string, unknown>) as WorkOrder)
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load work orders");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);`,
  ],
]);

patch("payments/PaymentsTable.tsx", [
  [
    'import React, { useMemo, useState } from "react";',
    `import React, { useEffect, useMemo, useState } from "react";
import { paymentsApi, projectsApi, storesApi } from "@/services/crmApi";
import { labelToEnum, paymentMethodToEnum } from "@/lib/mappers";
import { mapPayment, toIsoDateOrNull } from "@/lib/crmMappers";`,
  ],
  [
    "const [payments, setPayments] = useState(initialPayments);",
    `const [payments, setPayments] = useState<Payment[]>([]);
  const [apiProjects, setApiProjects] = useState<
    Array<{ id: string; name: string; client: string; store: string }>
  >([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [pay, projects, stores] = await Promise.all([
          paymentsApi.list({ limit: 100 }),
          projectsApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreOptions(stores.items.map((s) => ({ id: s.id, name: s.name })));
        setApiProjects(
          projects.items.map((p) => {
            const row = p as Record<string, unknown>;
            const store = row.store as { name?: string } | null;
            return {
              id: String(row.id),
              name: String(row.name || ""),
              client: String(row.clientName || ""),
              store: store?.name || "",
            };
          })
        );
        setPayments(
          pay.items.map((i) => mapPayment(i as Record<string, unknown>) as Payment)
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load payments");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);`,
  ],
]);

patch("purchase-orders/PurchaseOrdersTable.tsx", [
  [
    'import React, { useMemo, useState } from "react";',
    `import React, { useEffect, useMemo, useState } from "react";
import { purchaseOrdersApi, projectsApi, storesApi } from "@/services/crmApi";
import { labelToEnum, materialCategoryToEnum } from "@/lib/mappers";
import { mapPurchaseOrder, toIsoDateOrNull } from "@/lib/crmMappers";`,
  ],
  [
    "const [orders, setOrders] = useState(initialOrders);",
    `const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [apiProjects, setApiProjects] = useState<
    Array<{ id: string; name: string; store: string }>
  >([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [po, projects, stores] = await Promise.all([
          purchaseOrdersApi.list({ limit: 100 }),
          projectsApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreOptions(stores.items.map((s) => ({ id: s.id, name: s.name })));
        setApiProjects(
          projects.items.map((p) => {
            const row = p as Record<string, unknown>;
            const store = row.store as { name?: string } | null;
            return {
              id: String(row.id),
              name: String(row.name || ""),
              store: store?.name || "",
            };
          })
        );
        setOrders(
          po.items.map(
            (i) => mapPurchaseOrder(i as Record<string, unknown>) as PurchaseOrder
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load purchase orders");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);`,
  ],
]);

patch("warranty/WarrantyDeskTable.tsx", [
  [
    'import React, { useMemo, useState } from "react";',
    `import React, { useEffect, useMemo, useState } from "react";
import { warrantyApi, projectsApi, storesApi } from "@/services/crmApi";
import { labelToEnum, warrantyTypeToEnum } from "@/lib/mappers";
import { mapWarranty, toIsoDateOrNull } from "@/lib/crmMappers";`,
  ],
  [
    "const [tickets, setTickets] = useState(initialTickets);",
    `const [tickets, setTickets] = useState<WarrantyTicket[]>([]);
  const [apiProjects, setApiProjects] = useState<
    Array<{ id: string; name: string; client?: string; store: string }>
  >([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [ticketsData, projects, stores] = await Promise.all([
          warrantyApi.list({ limit: 100 }),
          projectsApi.list({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreOptions(stores.items.map((s) => ({ id: s.id, name: s.name })));
        setApiProjects(
          projects.items.map((p) => {
            const row = p as Record<string, unknown>;
            const store = row.store as { name?: string } | null;
            return {
              id: String(row.id),
              name: String(row.name || ""),
              client: String(row.clientName || ""),
              store: store?.name || "",
            };
          })
        );
        setTickets(
          ticketsData.items.map(
            (i) => mapWarranty(i as Record<string, unknown>) as WarrantyTicket
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load warranty tickets");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);`,
  ],
]);

patch("hr/HrDashboard.tsx", [
  [
    'import React, { useMemo, useState } from "react";',
    `import React, { useEffect, useMemo, useState } from "react";
import { hrApi, storesApi } from "@/services/crmApi";
import { labelToEnum } from "@/lib/mappers";
import { mapEmployee, mapLeave, toIsoDateOrNull } from "@/lib/crmMappers";`,
  ],
  [
    "const [leaves, setLeaves] = useState(initialLeaves);",
    `const [leaves, setLeaves] = useState<LeaveRequest[]>([]);`,
  ],
  [
    "const [staff, setStaff] = useState(initialEmployees);",
    `const [staff, setStaff] = useState<Employee[]>([]);
  const [storeOptions, setStoreOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [emps, leaveData, stores] = await Promise.all([
          hrApi.listEmployees({ limit: 100 }),
          hrApi.listLeaves({ limit: 100 }),
          storesApi.list({ limit: 100 }),
        ]);
        if (cancelled) return;
        setStoreOptions(stores.items.map((s) => ({ id: s.id, name: s.name })));
        setStaff(
          emps.items.map((i) => mapEmployee(i as Record<string, unknown>) as Employee)
        );
        setLeaves(
          leaveData.items.map((i) => mapLeave(i as Record<string, unknown>) as LeaveRequest)
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load HR data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);`,
  ],
]);

console.log("patch script finished");
