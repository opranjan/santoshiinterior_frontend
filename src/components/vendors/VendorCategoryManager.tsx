"use client";

import React, { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { vendorsApi } from "@/services/crmApi";

export type VendorCategoryRow = { id: string; name: string; sortOrder: number };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  categories: VendorCategoryRow[];
  onChange: (next: VendorCategoryRow[]) => void;
};

export default function VendorCategoryManager({ isOpen, onClose, categories, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [replaceWithId, setReplaceWithId] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const selected = categories.find((row) => row.id === replaceId);
  const replaceOptions = useMemo(
    () => categories.filter((row) => row.id !== replaceId),
    [categories, replaceId]
  );

  const resetAdd = () => {
    setAdding(false);
    setNewName("");
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      setSaving(true);
      setError("");
      const row = await vendorsApi.createCategory(name);
      onChange([...categories, row]);
      resetAdd();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add category");
    } finally {
      setSaving(false);
    }
  };

  const saveRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    try {
      setSaving(true);
      setError("");
      const row = await vendorsApi.updateCategory(id, name);
      onChange(categories.map((item) => (item.id === id ? row : item)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update category");
    } finally {
      setSaving(false);
    }
  };

  const dropOn = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = categories.map((row) => row.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);
    const next = ids
      .map((id) => categories.find((row) => row.id === id))
      .filter(Boolean) as VendorCategoryRow[];
    onChange(next);
    setDragId(null);
    try {
      const saved = await vendorsApi.reorderCategories(ids);
      onChange(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder categories");
    }
  };

  const replaceAndDelete = async () => {
    if (!replaceId || !replaceWithId) return;
    try {
      setSaving(true);
      setError("");
      await vendorsApi.replaceCategory(replaceId, replaceWithId);
      onChange(categories.filter((row) => row.id !== replaceId));
      setReplaceId(null);
      setReplaceWithId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not replace category");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className="max-w-xl p-6 shadow-xl"
        showCloseButton={false}
        overlayClassName="fixed inset-0 h-full w-full bg-black/20"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white/90">Vendors</h3>
            <button
              type="button"
              onClick={() => {
                setAdding((prev) => !prev);
                setError("");
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#E85D75] text-lg font-semibold text-white"
              aria-label={adding ? "Close add category" : "Add category"}
            >
              {adding ? "−" : "+"}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error ? <p className="mb-3 text-sm text-error-500">{error}</p> : null}

        {adding ? (
          <div className="mb-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-white/80">New Vendor</p>
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter name"
                className="h-11 flex-1 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#E85D75] dark:border-gray-700 dark:bg-gray-900"
              />
              <button
                type="button"
                disabled={!newName.trim() || saving}
                onClick={() => void addCategory()}
                className="h-11 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-500 disabled:opacity-50 enabled:bg-[#E85D75] enabled:text-white"
              >
                Add Category
              </button>
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-[1fr_80px] bg-gray-50 px-4 py-3 text-sm font-medium text-gray-500 dark:bg-white/[0.03]">
            <span>Category</span>
            <span className="text-right">Action</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {categories.map((row) => (
              <div
                key={row.id}
                draggable
                onDragStart={() => setDragId(row.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void dropOn(row.id)}
                className="grid grid-cols-[1fr_80px] items-center border-t border-gray-100 px-4 py-3 dark:border-gray-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="cursor-grab text-gray-300" aria-hidden>
                    ⋮⋮
                  </span>
                  {editingId === row.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => void saveRename(row.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void saveRename(row.id);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      className="h-9 w-full rounded border border-[#E85D75] px-2 text-sm outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(row.id);
                        setEditName(row.name);
                      }}
                      className="truncate text-left text-sm text-gray-800 dark:text-white/80"
                    >
                      {row.name}
                    </button>
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setReplaceId(row.id);
                      setReplaceWithId("");
                    }}
                    className="text-gray-400 hover:text-gray-700"
                    aria-label={`Edit ${row.name}`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L8.25 18.403l-4.5 1.125 1.125-4.5L16.862 4.487z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(replaceId)}
        onClose={() => setReplaceId(null)}
        className="max-w-md p-6 shadow-xl"
        showCloseButton={false}
        overlayClassName="fixed inset-0 h-full w-full bg-black/20"
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Replace & Delete
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#FDE8EC] text-xs text-[#E85D75]">
              i
            </span>
          </h3>
          <button
            type="button"
            onClick={() => setReplaceId(null)}
            className="text-2xl leading-none text-gray-400"
            aria-label="Close replace dialog"
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs text-gray-400">Selected Status</p>
            <div className="h-11 rounded-lg border border-gray-200 px-3.5 text-sm leading-[44px] text-gray-800 dark:border-gray-700 dark:text-white/80">
              {selected?.name}
            </div>
          </div>
          <div>
            <select
              value={replaceWithId}
              onChange={(e) => setReplaceWithId(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">Replace With</option>
              {replaceOptions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={!replaceWithId || saving}
              onClick={() => void replaceAndDelete()}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-500 disabled:opacity-40 enabled:border-[#E85D75] enabled:text-[#E85D75]"
            >
              Replace & Delete
            </button>
            <button
              type="button"
              onClick={() => setReplaceId(null)}
              className="h-10 rounded-lg bg-[#B42318] px-4 text-sm font-medium text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
