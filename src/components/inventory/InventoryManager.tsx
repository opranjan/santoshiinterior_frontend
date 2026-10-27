"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  inventoryApi,
  projectsApi,
  type InventoryInboxRow,
  type InventoryTxnDto,
  type WarehouseDto,
  type WarehouseKind,
} from "@/services/crmApi";
import { FilterBtn, SegPills, WarehouseActionMenu } from "./inventoryChrome";
import InventoryItemFormModal from "./InventoryItemFormModal";
import { fieldClass, fmtDate, fmtDt, goldBtn, money, moneyPlain, outlineBtn } from "./inventoryUi";

type MainTab = "warehouses" | "deliveries" | "expense" | "history";

export default function InventoryManager() {
  const router = useRouter();
  const [tab, setTab] = useState<MainTab>("warehouses");
  const [kind, setKind] = useState<WarehouseKind>("COMPANY");
  const [archived, setArchived] = useState("false");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<WarehouseDto[]>([]);
  const [inboxStatus, setInboxStatus] = useState<"PENDING" | "RECORDED" | "DISCARDED">("PENDING");
  const [inbox, setInbox] = useState<{ items: InventoryInboxRow[]; total: number; sum: number }>({
    items: [],
    total: 0,
    sum: 0,
  });
  const [txns, setTxns] = useState<InventoryTxnDto[]>([]);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<WarehouseKind>("COMPANY");
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [materialQ, setMaterialQ] = useState("");
  const [materialHits, setMaterialHits] = useState<
    Awaited<ReturnType<typeof inventoryApi.materialSearch>>
  >([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editWh, setEditWh] = useState<WarehouseDto | null>(null);
  const [editName, setEditName] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [revertedWh, setRevertedWh] = useState<WarehouseDto | null>(null);
  const [revertedTxns, setRevertedTxns] = useState<InventoryTxnDto[]>([]);

  const loadWarehouses = useCallback(async () => {
    const data = await inventoryApi.warehouses({
      kind,
      archived,
      search: search || undefined,
    });
    setRows(data);
  }, [kind, archived, search]);

  useEffect(() => {
    if (tab !== "warehouses") return;
    loadWarehouses().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [tab, loadWarehouses]);

  const loadInbox = useCallback(async () => {
    const data =
      tab === "deliveries"
        ? await inventoryApi.deliveries(inboxStatus)
        : await inventoryApi.expenses(inboxStatus);
    setInbox(data);
  }, [tab, inboxStatus]);

  useEffect(() => {
    if (tab !== "deliveries" && tab !== "expense") return;
    loadInbox().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [tab, loadInbox]);

  useEffect(() => {
    if (tab !== "history") return;
    inventoryApi
      .transactions({ limit: 80 })
      .then((r) => setTxns(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, [tab]);

  const filtered = useMemo(() => rows, [rows]);

  const createWarehouse = async () => {
    if (!name.trim()) return;
    try {
      await inventoryApi.createWarehouse({
        name: name.trim(),
        kind: addKind,
        projectId: addKind === "PROJECT" ? projectId : null,
      });
      setAddOpen(false);
      setName("");
      setTab("warehouses");
      setKind(addKind);
      await loadWarehouses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add warehouse");
    }
  };

  const runMaterialSearch = async (q: string) => {
    setMaterialQ(q);
    if (!q.trim()) {
      setMaterialHits([]);
      return;
    }
    try {
      setMaterialHits(await inventoryApi.materialSearch(q.trim()));
    } catch {
      setMaterialHits([]);
    }
  };

  return (
    <div className="vendor-form space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[#1c1610] dark:text-white">Inventory Management</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className={goldBtn}
              onClick={async () => {
                setAddOpen(true);
                const list = await projectsApi.list({ limit: 100 });
                setProjects(
                  (list.items || []).map((p) => ({
                    id: String(p.id),
                    name: String(p.name || "Untitled project"),
                  }))
                );
              }}
            >
              Add Warehouse
            </button>
          </div>
          <button type="button" className={outlineBtn} onClick={() => setMaterialOpen(true)}>
            🔍 Material Search
          </button>
          <button type="button" className={outlineBtn} onClick={() => setCatalogOpen(true)} title="Add catalog item">
            📦
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 border-b border-[#eadfcf] text-sm">
        {(
          [
            ["warehouses", "Warehouse/Site"],
            ["deliveries", "Deliveries StockIn"],
            ["expense", "Expense StockIn"],
            ["history", "Transaction History"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`border-b-2 pb-2 ${tab === key ? "border-[#C4A574] font-medium text-[#C4A574]" : "border-transparent text-gray-500"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "warehouses" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-xl border border-[#eadfcf] bg-white p-1">
              {(["COMPANY", "PROJECT"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-lg px-4 py-2 text-sm ${kind === k ? "bg-[#C4A574] font-medium text-[#1c1610]" : "text-gray-500"}`}
                >
                  {k === "COMPANY" ? "Company Warehouses" : "Project Warehouses"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={`${fieldClass} h-10 w-52`} placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className={`${fieldClass} h-10 w-40`} value={archived} onChange={(e) => setArchived(e.target.value)}>
                <option value="false">Unarchived</option>
                <option value="true">Archived</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          <div className="overflow-visible rounded-2xl border border-[#eadfcf] dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f6f0e6] text-left text-xs font-semibold uppercase tracking-wide text-[#6b5c48]">
                <tr>
                  <th className="px-4 py-3">S.No</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Goods Value</th>
                  <th className="px-4 py-3">Last Stock In</th>
                  <th className="px-4 py-3">Last Stock Out</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                      No warehouses yet. Add a company or project warehouse.
                    </td>
                  </tr>
                )}
                {filtered.map((w, i) => (
                  <tr
                    key={w.id}
                    className="cursor-pointer border-t border-[#eadfcf] hover:bg-[#faf6ef]"
                    onClick={() => router.push(`/inventory/warehouses/${w.id}`)}
                  >
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/inventory/warehouses/${w.id}`} className="font-medium text-[#1c1610] hover:text-[#C4A574]">
                        {w.name}
                      </Link>
                      {w.project?.name && <div className="text-xs text-gray-400">{w.project.name}</div>}
                    </td>
                    <td className="px-4 py-3">{money(w.goodsValue || 0, 0)}</td>
                    <td className="px-4 py-3">{fmtDt(w.lastStockIn)}</td>
                    <td className="px-4 py-3">{fmtDt(w.lastStockOut)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <WarehouseActionMenu
                        archived={w.archived}
                        onEdit={async () => {
                          setEditWh(w);
                          setEditName(w.name);
                          setEditProjectId(w.projectId || "");
                          if (w.kind === "PROJECT" && !projects.length) {
                            const list = await projectsApi.list({ limit: 100 });
                            setProjects(
                              (list.items || []).map((p) => ({
                                id: String(p.id),
                                name: String(p.name || "Untitled project"),
                              }))
                            );
                          }
                        }}
                        onArchive={async () => {
                          await inventoryApi.updateWarehouse(w.id, { archived: !w.archived });
                          loadWarehouses();
                        }}
                        onReverted={async () => {
                          setRevertedWh(w);
                          const data = await inventoryApi.transactions({
                            warehouseId: w.id,
                            reverted: "true",
                            limit: 80,
                          });
                          setRevertedTxns(data.items);
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(tab === "deliveries" || tab === "expense") && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <SegPills
              value={inboxStatus}
              onChange={setInboxStatus}
              options={[
                { id: "PENDING", label: "Pending" },
                { id: "RECORDED", label: "Recorded" },
                { id: "DISCARDED", label: "Discarded" },
              ]}
            />
            <FilterBtn />
          </div>
          {tab === "expense" && (
            <p className="text-sm text-gray-500">
              {inbox.total} transactions &nbsp; Total: {moneyPlain(inbox.sum)}
            </p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-[#eadfcf]">
            {tab === "deliveries" ? (
              <table className="min-w-full text-sm">
                <thead className="bg-[#f6f0e6] text-left text-xs font-semibold uppercase text-[#6b5c48]">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Remark</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Delivered At</th>
                    <th className="px-4 py-3">Created By</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inbox.items.map((row) => (
                    <tr key={row.id} className="border-t border-[#eadfcf]">
                      <td className="px-4 py-3">{row.number}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3">{row.project}</td>
                      <td className="px-4 py-3">{row.vendor}</td>
                      <td className="max-w-[220px] truncate px-4 py-3" title={row.remark}>
                        {row.remark || "—"}
                      </td>
                      <td className="px-4 py-3">{moneyPlain(row.amount)}</td>
                      <td className="px-4 py-3">{fmtDate(row.deliveredAt)}</td>
                      <td className="px-4 py-3">{row.createdBy}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {inboxStatus === "PENDING" && (
                            <>
                              <button
                                type="button"
                                className="rounded-lg px-2 py-1 text-xs text-[#C4A574]"
                                onClick={async () => {
                                  await inventoryApi.setInboxStatus("DELIVERY", row.id, "RECORDED");
                                  loadInbox();
                                }}
                              >
                                Record
                              </button>
                              <button
                                type="button"
                                className="rounded-lg px-2 py-1 text-xs text-gray-400"
                                onClick={async () => {
                                  await inventoryApi.setInboxStatus("DELIVERY", row.id, "DISCARDED");
                                  loadInbox();
                                }}
                              >
                                Discard
                              </button>
                            </>
                          )}
                          {inboxStatus !== "PENDING" && (
                            <button
                              type="button"
                              className="text-xs text-gray-400"
                              onClick={async () => {
                                await inventoryApi.setInboxStatus("DELIVERY", row.id, "PENDING");
                                loadInbox();
                              }}
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inbox.items.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                        No deliveries.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-[#f6f0e6] text-left text-xs font-semibold uppercase text-[#6b5c48]">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Expense Date</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Remark</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inbox.items.map((row) => (
                    <tr key={row.id} className="border-t border-[#eadfcf]">
                      <td className="px-4 py-3">{row.user}</td>
                      <td className="px-4 py-3">{fmtDate(row.expenseDate)}</td>
                      <td className="px-4 py-3">{row.project}</td>
                      <td className="px-4 py-3">{moneyPlain(row.amount)}</td>
                      <td className="px-4 py-3">{row.vendor}</td>
                      <td className="px-4 py-3">{row.category || "—"}</td>
                      <td className="max-w-[240px] truncate px-4 py-3" title={row.remark}>
                        {row.remark || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {row.attachmentUrl ? (
                            <a href={row.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#eadfcf] text-xs">
                              📄
                            </a>
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#eadfcf] text-xs text-gray-300">
                              📄
                            </span>
                          )}
                          {inboxStatus === "PENDING" && (
                            <>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#C4A574] text-sm text-[#1c1610]"
                                title="Record"
                                onClick={async () => {
                                  await inventoryApi.setInboxStatus("EXPENSE", row.id, "RECORDED");
                                  loadInbox();
                                }}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#eadfcf] text-sm"
                                title="Discard"
                                onClick={async () => {
                                  await inventoryApi.setInboxStatus("EXPENSE", row.id, "DISCARDED");
                                  loadInbox();
                                }}
                              >
                                −
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {inbox.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        No expenses.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="overflow-x-auto rounded-2xl border border-[#eadfcf]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f6f0e6] text-left text-xs font-semibold uppercase text-[#6b5c48]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-t border-[#eadfcf]">
                  <td className="px-4 py-3">{fmtDt(t.occurredAt)}</td>
                  <td className="px-4 py-3">{t.warehouse?.name}</td>
                  <td className="px-4 py-3">{t.type}</td>
                  <td className="px-4 py-3">{t.item?.name}</td>
                  <td className="px-4 py-3">{t.quantity}</td>
                  <td className="px-4 py-3">{money(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="text-sm text-error-500">{error}</p>}

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} className="w-full max-w-md p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#1c1610]">Add Warehouse</h2>
        <div className="mb-3 flex gap-2">
          {(["COMPANY", "PROJECT"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setAddKind(k)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm ${addKind === k ? "border-[#C4A574] bg-[#faf6ef] text-[#1c1610]" : "border-[#eadfcf] text-gray-500"}`}
            >
              {k === "COMPANY" ? "Company" : "Project"}
            </button>
          ))}
        </div>
        <label className="mb-1 block text-xs font-medium">Name</label>
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Warehouse name" />
        {addKind === "PROJECT" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium">Project</label>
            <select className={fieldClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button type="button" className={goldBtn} onClick={createWarehouse}>
            Save
          </button>
        </div>
      </Modal>

      <Modal isOpen={materialOpen} onClose={() => setMaterialOpen(false)} className="w-full max-w-lg p-6">
        <h2 className="mb-3 text-lg font-semibold text-[#1c1610]">Material Search</h2>
        <input
          className={fieldClass}
          placeholder="Search catalog stock..."
          value={materialQ}
          onChange={(e) => runMaterialSearch(e.target.value)}
        />
        <div className="mt-3 max-h-80 overflow-auto">
          {materialHits.map((hit) => (
            <Link
              key={hit.id}
              href={`/inventory/warehouses/${hit.warehouse.id}`}
              className="block rounded-xl px-3 py-2 hover:bg-[#faf6ef]"
              onClick={() => setMaterialOpen(false)}
            >
              <div className="font-medium">{hit.item.name}</div>
              <div className="text-xs text-gray-500">
                {hit.warehouse.name} · Qty {hit.quantity} · {money(hit.lastPurchasedPrice, 0)}
              </div>
            </Link>
          ))}
          {materialQ && materialHits.length === 0 && (
            <p className="px-1 py-4 text-sm text-gray-400">No stock found. Add the item to catalog, then stock-in.</p>
          )}
        </div>
      </Modal>

      <InventoryItemFormModal
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        onSaved={() => setCatalogOpen(false)}
      />

      <Modal isOpen={Boolean(editWh)} onClose={() => setEditWh(null)} className="w-full max-w-md p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#1c1610]">Edit Warehouse</h2>
        <label className="mb-1 block text-xs font-medium">Name</label>
        <input className={fieldClass} value={editName} onChange={(e) => setEditName(e.target.value)} />
        {editWh?.kind === "PROJECT" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium">Project</label>
            <select className={fieldClass} value={editProjectId} onChange={(e) => setEditProjectId(e.target.value)}>
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={outlineBtn} onClick={() => setEditWh(null)}>
            Cancel
          </button>
          <button
            type="button"
            className={goldBtn}
            onClick={async () => {
              if (!editWh || !editName.trim()) return;
              await inventoryApi.updateWarehouse(editWh.id, {
                name: editName.trim(),
                projectId: editWh.kind === "PROJECT" ? editProjectId || null : null,
              });
              setEditWh(null);
              loadWarehouses();
            }}
          >
            Save
          </button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(revertedWh)} onClose={() => setRevertedWh(null)} className="w-full max-w-2xl p-6">
        <h2 className="mb-1 text-lg font-semibold text-[#1c1610]">View Reverted Tnx</h2>
        <p className="mb-4 text-sm text-gray-500">{revertedWh?.name}</p>
        <div className="max-h-[50vh] overflow-auto rounded-2xl border border-[#eadfcf]">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f6f0e6] text-left text-xs font-semibold uppercase text-[#6b5c48]">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {revertedTxns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No reverted transactions.
                  </td>
                </tr>
              )}
              {revertedTxns.map((t) => (
                <tr key={t.id} className="border-t border-[#eadfcf]">
                  <td className="px-4 py-3">{fmtDt(t.occurredAt)}</td>
                  <td className="px-4 py-3">{t.item?.name}</td>
                  <td className="px-4 py-3">{t.type}</td>
                  <td className="px-4 py-3">{t.quantity}</td>
                  <td className="px-4 py-3">{money(t.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
