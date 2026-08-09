"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { storesApi, usersApi } from "@/services/crmApi";
import { ApiError } from "@/lib/api";
import { labelToEnum } from "@/lib/mappers";

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

type ManagerOption = { id: string; name: string };

export default function StoreForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = Boolean(editId);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Madhya Pradesh");
  const [pincode, setPincode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [managerId, setManagerId] = useState("");
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [status, setStatus] = useState("Active");
  const [openedOn, setOpenedOn] = useState("");
  const [gstin, setGstin] = useState("");
  const [workingHours, setWorkingHours] = useState(
    "Mon–Sat · 10:00 AM – 7:00 PM"
  );
  const [notes, setNotes] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const users = await usersApi.list({ limit: 100 });
        setManagers(
          users.items.map((u) => ({ id: u.id, name: u.name || u.email }))
        );
      } catch {
        /* optional */
      }
    })();
  }, []);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const store = await storesApi.get(editId);
        setName(store.name);
        setCode(store.code);
        setCity(store.city);
        setState(store.state || "Madhya Pradesh");
        setPincode(store.pincode || "");
        setAddress(store.address || "");
        setPhone(store.phone);
        setEmail(store.email || "");
        setManagerId(store.managerId || "");
        setStatus(
          store.status === "COMING_SOON"
            ? "Coming Soon"
            : store.status === "INACTIVE"
              ? "Inactive"
              : "Active"
        );
        setOpenedOn(store.openedOn ? store.openedOn.slice(0, 10) : "");
        setGstin(store.gstin || "");
        setWorkingHours(store.workingHours || "");
        setNotes(store.notes || "");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load store");
      }
    })();
  }, [editId]);

  const buildPayload = () => {
    const openedOnValue =
      openedOn &&
      /^\d{4}-\d{2}-\d{2}$/.test(openedOn) &&
      Number(openedOn.slice(0, 4)) >= 1900
        ? `${openedOn}T00:00:00.000Z`
        : null;

    return {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      city: city.trim(),
      state,
      pincode: pincode || null,
      address: address || null,
      phone: phone.trim(),
      email: email || null,
      managerId: managerId || null,
      status: labelToEnum(status),
      openedOn: openedOnValue,
      gstin: gstin || null,
      workingHours: workingHours || null,
      notes: notes || null,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg("");
    setError("");
    if (!name.trim() || !city.trim() || !phone.trim()) {
      setError("Please fill Store Name, City and Phone.");
      return;
    }
    if (!code.trim()) {
      setError("Store Code is required.");
      return;
    }

    setLoading(true);
    const payload = buildPayload();

    try {
      if (isEdit && editId) {
        await storesApi.update(editId, payload);
        setSavedMsg(`Store “${name}” updated successfully.`);
      } else {
        await storesApi.create(payload);
        setSavedMsg(`Store “${name}” added successfully.`);
        setTimeout(() => router.push("/stores"), 700);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save store");
    } finally {
      setLoading(false);
    }
  };

  const closeStore = async () => {
    if (!editId) return;
    setBusyAction(true);
    setError("");
    try {
      await storesApi.update(editId, { status: "INACTIVE" });
      setStatus("Inactive");
      setSavedMsg("Store closed successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to close store");
    } finally {
      setBusyAction(false);
    }
  };

  const reopenStore = async () => {
    if (!editId) return;
    setBusyAction(true);
    setError("");
    try {
      await storesApi.update(editId, { status: "ACTIVE" });
      setStatus("Active");
      setSavedMsg("Store reopened successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reopen store");
    } finally {
      setBusyAction(false);
    }
  };

  const deleteStore = async () => {
    if (!editId) return;
    setBusyAction(true);
    setError("");
    try {
      await storesApi.remove(editId);
      router.push("/stores");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete store");
      setConfirmDelete(false);
    } finally {
      setBusyAction(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <ComponentCard
        title="Store Identity"
        desc="Basic identity used across leads, quotations, projects and reports."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="name">
              Store Name <span className="text-error-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. Main Branch / North Store"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="code">Store Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="e.g. IND-MAIN"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={selectClass}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive (Closed)</option>
              <option value="Coming Soon">Coming Soon</option>
            </select>
          </div>
          <div>
            <Label>Store Manager</Label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className={selectClass}
            >
              <option value="">Unassigned</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="openedOn">Opened On</Label>
            <Input
              id="openedOn"
              type="date"
              value={openedOn}
              onChange={(e) => setOpenedOn(e.target.value)}
            />
          </div>
        </div>
      </ComponentCard>

      <ComponentCard title="Location & Contact" desc="Address and contact details.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="city">
              City <span className="text-error-500">*</span>
            </Label>
            <Input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="phone">
              Phone <span className="text-error-500">*</span>
            </Label>
            <Input
              id="phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="gstin">GSTIN</Label>
            <Input
              id="gstin"
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="workingHours">Working Hours</Label>
            <Input
              id="workingHours"
              type="text"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <TextArea
              rows={3}
              value={notes}
              onChange={(value) => setNotes(value)}
            />
          </div>
        </div>
      </ComponentCard>

      {isEdit ? (
        <ComponentCard
          title="Store Operations"
          desc="Close, reopen, or permanently remove this store location."
        >
          <div className="flex flex-wrap gap-3">
            {status !== "Inactive" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busyAction}
                onClick={() => void closeStore()}
              >
                Close Store
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busyAction}
                onClick={() => void reopenStore()}
              >
                Reopen Store
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-error-500"
              disabled={busyAction}
              onClick={() => setConfirmDelete(true)}
            >
              Delete Store
            </Button>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Closing marks the store inactive. Delete only works when there are
            no linked leads, projects, quotations, or team members.
          </p>
        </ComponentCard>
      ) : null}

      {(error || savedMsg) && (
        <p className={`text-sm ${error ? "text-error-500" : "text-success-600"}`}>
          {error || savedMsg}
        </p>
      )}

      <div className="flex gap-3">
        <Button size="sm" type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update Store" : "Add Store"}
        </Button>
        <Link href="/stores">
          <Button size="sm" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>

      {confirmDelete ? (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete store?</h3>
            <p className="mt-2 text-sm text-gray-600">
              Permanently delete <strong>{name || "this store"}</strong>? This
              cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busyAction}
                onClick={() => setConfirmDelete(false)}
                className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => void deleteStore()}
                className="inline-flex h-10 items-center rounded-lg bg-error-500 px-4 text-sm font-medium text-white hover:bg-error-600"
              >
                {busyAction ? "Deleting…" : "Delete store"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  );
}
