"use client";

import React, { useEffect, useMemo, useState } from "react";
import Label from "@/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  BomLine,
  CatalogItem,
  CatalogItemBom,
} from "@/lib/quotationCatalogDefaults";

const accent = {
  text: "text-[#E85D75]",
  border: "border-[#E85D75]",
  bg: "bg-[#E85D75]",
  bgHover: "hover:bg-[#d94c65]",
  underline: "bg-[#E85D75]",
  ring: "focus:border-[#E85D75] focus:ring-[#E85D75]/15",
};

type BomTab = "materials" | "labour" | "machines";

const emptyBom = (): CatalogItemBom => ({
  outputQty: 1,
  materials: [],
  labour: [],
  machines: [],
});

const tabMeta: Record<
  BomTab,
  { label: string; addLabel: string; emptyTitle: string; emptyHint: string }
> = {
  materials: {
    label: "Materials",
    addLabel: "+ Material",
    emptyTitle: "No materials added yet",
    emptyHint: "Add materials to get started",
  },
  labour: {
    label: "Labour",
    addLabel: "+ Labour",
    emptyTitle: "No labour added yet",
    emptyHint: "Add labour to get started",
  },
  machines: {
    label: "Machines",
    addLabel: "+ Machine",
    emptyTitle: "No machines added yet",
    emptyHint: "Add machines to get started",
  },
};

type Props = {
  item: Pick<CatalogItem, "name" | "code" | "description" | "uom" | "bom">;
  saving?: boolean;
  onClose: () => void;
  onSave: (bom: CatalogItemBom) => void;
};

export default function BomModal({ item, saving, onClose, onSave }: Props) {
  const [tab, setTab] = useState<BomTab>("materials");
  const [outputQty, setOutputQty] = useState(
    String(item.bom?.outputQty ?? 1)
  );
  const [materials, setMaterials] = useState<BomLine[]>(
    item.bom?.materials || []
  );
  const [labour, setLabour] = useState<BomLine[]>(item.bom?.labour || []);
  const [machines, setMachines] = useState<BomLine[]>(
    item.bom?.machines || []
  );
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftRemarks, setDraftRemarks] = useState("");
  const [draftQty, setDraftQty] = useState("1");
  const [draftUom, setDraftUom] = useState("NOS");
  const [draftLpc, setDraftLpc] = useState("0");

  useEffect(() => {
    setTab("materials");
    setOutputQty(String(item.bom?.outputQty ?? 1));
    setMaterials(item.bom?.materials || []);
    setLabour(item.bom?.labour || []);
    setMachines(item.bom?.machines || []);
    setDraftOpen(false);
  }, [item]);

  const lines =
    tab === "materials" ? materials : tab === "labour" ? labour : machines;

  const setLines = (next: BomLine[]) => {
    if (tab === "materials") setMaterials(next);
    else if (tab === "labour") setLabour(next);
    else setMachines(next);
  };

  const dirty = useMemo(() => {
    const initial = item.bom || emptyBom();
    return (
      Number(outputQty) !== initial.outputQty ||
      JSON.stringify(materials) !== JSON.stringify(initial.materials || []) ||
      JSON.stringify(labour) !== JSON.stringify(initial.labour || []) ||
      JSON.stringify(machines) !== JSON.stringify(initial.machines || [])
    );
  }, [item.bom, outputQty, materials, labour, machines]);

  const canSave =
    dirty &&
    Number(outputQty) > 0 &&
    (materials.length > 0 || labour.length > 0 || machines.length > 0);

  const subtitle = item.description || item.code || "";

  const openAdd = () => {
    setDraftName("");
    setDraftRemarks("");
    setDraftQty("1");
    setDraftUom(item.uom || "NOS");
    setDraftLpc("0");
    setDraftOpen(true);
  };

  const commitDraft = () => {
    if (!draftName.trim()) return;
    const line: BomLine = {
      id: `bom-${Date.now()}`,
      name: draftName.trim(),
      remarks: draftRemarks.trim(),
      qty: Number(draftQty) || 0,
      uom: draftUom.trim() || "NOS",
      lpc: Number(draftLpc) || 0,
    };
    setLines([line, ...lines]);
    setDraftOpen(false);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  const handleSave = () => {
    onSave({
      outputQty: Number(outputQty) || 1,
      materials,
      labour,
      machines,
    });
  };

  const meta = tabMeta[tab];
  const fieldClass = `h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-3 sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            BOM
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-4">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#E85D75]/35 bg-[#E85D75]/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-gray-900 dark:text-white/90">
                {item.name || "Untitled item"}
              </p>
              {subtitle ? (
                <p className="mt-0.5 truncate text-sm text-gray-500">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="w-full sm:w-[200px]">
              <Label className="mb-1 text-xs">
                Output Quantity<span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={outputQty}
                  onChange={(e) => setOutputQty(e.target.value)}
                  className={`h-10 w-full rounded-lg border ${accent.border} bg-white px-3 text-sm text-gray-800 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 ${accent.ring}`}
                />
                <span className="shrink-0 text-sm font-medium text-gray-600">
                  {item.uom || "NOS"}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5 border-b border-gray-200 dark:border-gray-800">
              {(Object.keys(tabMeta) as BomTab[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTab(id);
                    setDraftOpen(false);
                  }}
                  className={`relative -mb-px pb-2.5 text-sm font-medium transition ${
                    tab === id
                      ? accent.text
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tabMeta[id].label}
                  {tab === id && (
                    <span
                      className={`absolute inset-x-0 bottom-0 h-0.5 ${accent.underline}`}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  /* import stub */
                }}
                className={`inline-flex h-9 items-center justify-center rounded-lg border ${accent.border} bg-white px-3 text-sm font-medium ${accent.text} hover:bg-[#E85D75]/5`}
              >
                Import
              </button>
              <button
                type="button"
                onClick={openAdd}
                className={`inline-flex h-9 items-center justify-center rounded-lg ${accent.bg} px-3 text-sm font-medium text-white ${accent.bgHover}`}
              >
                {meta.addLabel}
              </button>
            </div>
          </div>

          {draftOpen && (
            <div className="mb-3 grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-6 dark:border-gray-700 dark:bg-white/[0.03]">
              <input
                className={`${fieldClass} sm:col-span-2`}
                placeholder="Name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
              />
              <input
                className={`${fieldClass} sm:col-span-1`}
                placeholder="Remarks"
                value={draftRemarks}
                onChange={(e) => setDraftRemarks(e.target.value)}
              />
              <input
                className={fieldClass}
                type="number"
                min="0"
                step="0.01"
                placeholder="Qty"
                value={draftQty}
                onChange={(e) => setDraftQty(e.target.value)}
              />
              <input
                className={fieldClass}
                placeholder="UOM"
                value={draftUom}
                onChange={(e) => setDraftUom(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className={fieldClass}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="LPC"
                  value={draftLpc}
                  onChange={(e) => setDraftLpc(e.target.value)}
                />
                <button
                  type="button"
                  onClick={commitDraft}
                  disabled={!draftName.trim()}
                  className={`inline-flex h-10 shrink-0 items-center rounded-lg ${accent.bg} px-3 text-sm font-medium text-white disabled:opacity-50`}
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50 dark:border-white/[0.05] dark:bg-white/[0.02]">
                  <TableRow>
                    {["S.No.", "Name", "Remarks", "Qty", "UOM", "LPC", ""].map(
                      (h) => (
                        <TableCell
                          key={h || "actions"}
                          isHeader
                          className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500"
                        >
                          {h}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow
                      key={line.id}
                      className="border-b border-gray-100 dark:border-white/[0.04]"
                    >
                      <TableCell className="px-4 py-3 text-sm text-gray-600">
                        {index + 1}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-white/90">
                        {line.name}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500">
                        {line.remarks || "—"}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700">
                        {line.qty}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600">
                        {line.uom}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-700">
                        {line.lpc}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-end">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="text-sm text-error-500 hover:underline"
                        >
                          Remove
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-14">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <svg
                              width="28"
                              height="28"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <rect
                                x="5"
                                y="4"
                                width="14"
                                height="16"
                                rx="2"
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                              />
                              <path
                                d="M8 9h8"
                                stroke="#60a5fa"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M8 13h8"
                                stroke="#f472b6"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M8 17h5"
                                stroke="#a78bfa"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {meta.emptyTitle}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {meta.emptyHint}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 px-5 py-4 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className={`inline-flex h-10 min-w-[96px] items-center justify-center rounded-lg px-5 text-sm font-medium text-white transition ${
              canSave
                ? `${accent.bg} ${accent.bgHover}`
                : "cursor-not-allowed bg-slate-400"
            } disabled:opacity-70`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
