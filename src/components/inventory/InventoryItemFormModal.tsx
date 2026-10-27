"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  inventoryApi,
  type InventoryGoodsType,
  type InventoryItemDto,
} from "@/services/crmApi";
import { fieldClass, goldBtn, GOODS_TYPE_LABEL, outlineBtn } from "./inventoryUi";

type Props = {
  open: boolean;
  onClose: () => void;
  initialName?: string;
  defaultCategory?: string;
  onSaved: (item: InventoryItemDto) => void;
};

export default function InventoryItemFormModal({
  open,
  onClose,
  initialName = "",
  defaultCategory = "",
  onSaved,
}: Props) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [aliases, setAliases] = useState<string[]>([]);
  const [category, setCategory] = useState(defaultCategory);
  const [goodsType, setGoodsType] = useState<InventoryGoodsType>("RAW_MATERIAL");
  const [brand, setBrand] = useState("");
  const [primaryUom, setPrimaryUom] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [hsnSac, setHsnSac] = useState("");
  const [taxPercent, setTaxPercent] = useState("18");
  const [mrp, setMrp] = useState("0.00");
  const [categories, setCategories] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setDescription("");
    setAliasInput("");
    setAliases([]);
    setCategory(defaultCategory);
    setGoodsType("RAW_MATERIAL");
    setBrand("");
    setPrimaryUom("");
    setItemCode("");
    setHsnSac("");
    setTaxPercent("18");
    setMrp("0.00");
    setImageFile(null);
    setPreview(null);
    setError("");
    inventoryApi.itemMeta().then((m) => setCategories(m.categories)).catch(() => {});
  }, [open, initialName, defaultCategory]);

  const addAlias = () => {
    const v = aliasInput.trim();
    if (!v || aliases.includes(v)) return;
    setAliases((a) => [...a, v]);
    setAliasInput("");
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Item name is required");
      return;
    }
    if (!category.trim()) {
      setError("Category is required");
      return;
    }
    if (!primaryUom.trim()) {
      setError("Primary UOM is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const item = await inventoryApi.createItem({
        name: name.trim(),
        description,
        aliases,
        category: category.trim(),
        goodsType,
        brand,
        primaryUom: primaryUom.trim(),
        itemCode,
        hsnSac,
        taxPercent: Number(taxPercent) || 0,
        mrp: Number(mrp) || 0,
      });
      if (imageFile) {
        const withImage = await inventoryApi.uploadItemImage(item.id, imageFile);
        onSaved(withImage);
      } else {
        onSaved(item);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="w-full max-w-4xl p-0" showCloseButton={false}>
      <div className="flex items-center justify-between border-b border-[#eadfcf] px-5 py-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-2 font-semibold text-[#C4A574]">
            <span className="h-2 w-2 rounded-full bg-[#C4A574]" />
            NEW ITEM
          </span>
          <span className="rounded-lg bg-[#faf6ef] px-3 py-1 text-[#1c1610]">Item Details</span>
        </div>
        <button type="button" onClick={onClose} className="text-xl text-gray-400 hover:text-[#1c1610]">
          ×
        </button>
      </div>

      <div className="max-h-[78vh] overflow-y-auto px-5 py-4">
        <section className="rounded-2xl border border-[#eadfcf] bg-[#fcfaf6] p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C4A574]">
            <span className="h-3 w-0.5 rounded bg-[#C4A574]" /> Identity
          </div>
          <div className="flex flex-col gap-4 md:flex-row">
            <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#C4A574]/50 bg-white text-xs text-gray-400 md:w-40">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full rounded-xl object-cover" />
              ) : (
                <>
                  <span className="mb-1 text-lg">🖼</span>
                  Click or drag
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  setPreview(URL.createObjectURL(file));
                }}
              />
            </label>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-medium text-[#1c1610]">
                  <span>Item Name *</span>
                  <span className="text-gray-400">{name.length}/512</span>
                </div>
                <input className={fieldClass} value={name} maxLength={512} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#1c1610]">Description</label>
                <textarea
                  className={`${fieldClass} h-20 py-2`}
                  placeholder="Brief description of this item..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#1c1610]">Aliases</label>
                <input
                  className={fieldClass}
                  placeholder="Type and press Enter to add..."
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAlias();
                    }
                  }}
                />
                {aliases.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {aliases.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className="rounded-full bg-[#eadfcf] px-2 py-0.5 text-xs text-[#1c1610]"
                        onClick={() => setAliases((list) => list.filter((x) => x !== a))}
                      >
                        {a} ×
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#eadfcf] bg-[#fcfaf6] p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C4A574]">
            <span className="h-3 w-0.5 rounded bg-[#C4A574]" /> Classification
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Category *</label>
              <input
                className={fieldClass}
                list="inv-cats"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Select Category"
              />
              <datalist id="inv-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Goods Type *</label>
              <select className={fieldClass} value={goodsType} onChange={(e) => setGoodsType(e.target.value as InventoryGoodsType)}>
                {Object.entries(GOODS_TYPE_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Brand</label>
              <input className={fieldClass} placeholder="e.g. Apple, Samsung..." value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-[#eadfcf] bg-[#fcfaf6] p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C4A574]">
            <span className="h-3 w-0.5 rounded bg-[#C4A574]" /> Measurement & Identifiers
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium">Primary UOM *</label>
              <input className={fieldClass} list="inv-uoms" placeholder="Select UOM" value={primaryUom} onChange={(e) => setPrimaryUom(e.target.value)} />
              <datalist id="inv-uoms">
                {["Nos", "Sq Ft", "Rft", "Kg", "Ltr", "Box", "Set", "Meter"].map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Item Code</label>
              <input className={fieldClass} placeholder="ITM-001" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">HSN / SAC</label>
              <input className={fieldClass} value={hsnSac} onChange={(e) => setHsnSac(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Tax %</label>
              <input className={fieldClass} value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">MRP</label>
              <input className={fieldClass} value={mrp} onChange={(e) => setMrp(e.target.value)} />
            </div>
          </div>
        </section>

        {error && <p className="mt-3 text-sm text-error-500">{error}</p>}
      </div>

      <div className="flex justify-end gap-3 border-t border-[#eadfcf] px-5 py-4">
        <button type="button" className={outlineBtn} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={goldBtn} disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save Item"}
        </button>
      </div>
    </Modal>
  );
}
