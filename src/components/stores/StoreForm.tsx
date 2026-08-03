"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { storesApi } from "@/services/crmApi";
import { ApiError } from "@/lib/api";
import { labelToEnum } from "@/lib/mappers";

const selectClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

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

    // HTML date inputs can produce invalid years; only send a real YYYY-MM-DD
    const openedOnValue =
      openedOn && /^\d{4}-\d{2}-\d{2}$/.test(openedOn) && Number(openedOn.slice(0, 4)) >= 1900
        ? `${openedOn}T00:00:00.000Z`
        : null;

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      city: city.trim(),
      state,
      pincode: pincode || null,
      address: address || null,
      phone: phone.trim(),
      email: email || null,
      status: labelToEnum(status),
      openedOn: openedOnValue,
      gstin: gstin || null,
      workingHours: workingHours || null,
      notes: notes || null,
    };

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
              <option value="Inactive">Inactive</option>
              <option value="Coming Soon">Coming Soon</option>
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
    </form>
  );
}
