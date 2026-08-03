"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import { ChevronDownIcon } from "@/icons/index";
import { leadsApi, storesApi } from "@/services/crmApi";
import { ApiError } from "@/lib/api";

const leadSourceOptions = [
  { value: "Walk-in", label: "Walk-in" },
  { value: "Referral", label: "Referral" },
  { value: "Website", label: "Website" },
  { value: "Instagram", label: "Instagram" },
  { value: "Facebook", label: "Facebook" },
  { value: "WhatsApp", label: "WhatsApp" },
  { value: "Exhibition", label: "Exhibition" },
  { value: "Other", label: "Other" },
];

const statusOptions = [
  { value: "CREATED", label: "Created" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "QUOTATION", label: "Quotation Sent" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

const budgetOptions = [
  { value: "Under ₹5 Lakh", label: "Under ₹5 Lakh" },
  { value: "₹5 – 10 Lakh", label: "₹5 – 10 Lakh" },
  { value: "₹10 – 25 Lakh", label: "₹10 – 25 Lakh" },
  { value: "₹25 – 50 Lakh", label: "₹25 – 50 Lakh" },
  { value: "Above ₹50 Lakh", label: "Above ₹50 Lakh" },
];

const scopeOptions = [
  { value: "Full Home Interiors", label: "Full Home Interiors" },
  { value: "Modular Kitchen", label: "Modular Kitchen" },
  { value: "Living Room", label: "Living Room" },
  { value: "Bedroom", label: "Bedroom" },
  { value: "Office Fit-out", label: "Office Fit-out" },
  { value: "Renovation", label: "Renovation" },
  { value: "Other", label: "Other" },
];

const projectTypeOptions = [
  { value: "Residential", label: "Residential" },
  { value: "Commercial", label: "Commercial" },
  { value: "Office", label: "Office" },
  { value: "Retail Showroom", label: "Retail Showroom" },
  { value: "Renovation", label: "Renovation" },
];

const financialYearOptions = [
  { value: "2024-25", label: "2024-25" },
  { value: "2025-26", label: "2025-26" },
  { value: "2026-27", label: "2026-27" },
  { value: "2027-28", label: "2027-28" },
];

const PROJECT_NAME_MAX = 255;

export default function LeadForm() {
  const router = useRouter();
  const [storeOptions, setStoreOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [storeId, setStoreId] = useState("");
  const [source, setSource] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState("NEW");
  const [budget, setBudget] = useState("");
  const [scope, setScope] = useState("");
  const [projectType, setProjectType] = useState("");
  const [financialYear, setFinancialYear] = useState("2025-26");
  const [tentativeStart, setTentativeStart] = useState("");
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [latestRemark, setLatestRemark] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await storesApi.list({ limit: 100 });
        setStoreOptions(
          data.items.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.city})`,
          }))
        );
        if (data.items[0]) setStoreId(data.items[0].id);
      } catch {
        // ignore for now; form can still submit without store
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!clientName.trim() || !phone.trim()) {
      setError("Client name and phone are required.");
      return;
    }

    setLoading(true);
    try {
      await leadsApi.create({
        clientName: clientName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone || null,
        email: email || null,
        clientAddress: clientAddress || null,
        storeId: storeId || null,
        source: source || null,
        projectName: projectName || null,
        projectType: projectType || null,
        scope: scope || null,
        budget: budget || null,
        status: status || "NEW",
        financialYear: financialYear || null,
        tentativeStart:
          tentativeStart && /^\d{4}-\d{2}-\d{2}$/.test(tentativeStart)
            ? `${tentativeStart}T00:00:00.000Z`
            : null,
        tags: tags || null,
        description: description || null,
        latestRemark: latestRemark || null,
      });
      setSuccess("Lead created successfully.");
      setTimeout(() => router.push("/sales/leads"), 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create lead");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ComponentCard
        title="Client Details"
        desc="Capture basic contact and lead source information."
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="clientName">
              Client Name <span className="text-error-500">*</span>
            </Label>
            <Input
              type="text"
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client full name"
            />
          </div>
          <div>
            <Label htmlFor="phone">
              Phone / WhatsApp <span className="text-error-500">*</span>
            </Label>
            <Input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter mobile number"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@email.com"
            />
          </div>
          <div>
            <Label htmlFor="alternatePhone">Alternate Phone</Label>
            <Input
              type="tel"
              id="alternatePhone"
              value={alternatePhone}
              onChange={(e) => setAlternatePhone(e.target.value)}
              placeholder="Optional alternate number"
            />
          </div>
          <div>
            <Label>Store</Label>
            <div className="relative">
              <Select
                options={storeOptions}
                placeholder="Select store"
                defaultValue={storeId}
                onChange={setStoreId}
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div>
            <Label>Lead Source</Label>
            <div className="relative">
              <Select
                options={leadSourceOptions}
                placeholder="Select lead source"
                onChange={setSource}
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="clientAddress">Client Address / City</Label>
            <Input
              type="text"
              id="clientAddress"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="Enter city or full address"
            />
          </div>
        </div>
      </ComponentCard>

      <ComponentCard
        title="Project Details"
        desc="Project ownership, scope, budget, and timeline."
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label htmlFor="projectName" className="mb-0">
                Project Name
              </Label>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {projectName.length} / {PROJECT_NAME_MAX}
              </span>
            </div>
            <Input
              type="text"
              id="projectName"
              value={projectName}
              maxLength={PROJECT_NAME_MAX}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter Project Name"
            />
          </div>
          <div>
            <Label>Status</Label>
            <div className="relative">
              <Select
                options={statusOptions}
                placeholder="Select Status"
                defaultValue={status}
                onChange={setStatus}
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div>
            <Label>Budget</Label>
            <div className="relative">
              <Select
                options={budgetOptions}
                placeholder="Select budget"
                onChange={setBudget}
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div>
            <Label>Scope</Label>
            <div className="relative">
              <Select
                options={scopeOptions}
                placeholder="Select scope"
                onChange={setScope}
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div>
            <Label>Project Type</Label>
            <div className="relative">
              <Select
                options={projectTypeOptions}
                placeholder="Select type"
                onChange={setProjectType}
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div>
            <Label>Financial Year</Label>
            <div className="relative">
              <Select
                options={financialYearOptions}
                placeholder="Select FY"
                defaultValue={financialYear}
                onChange={setFinancialYear}
              />
              <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div>
            <Label htmlFor="tentativeStart">Tentative Start</Label>
            <Input
              id="tentativeStart"
              type="date"
              value={tentativeStart}
              onChange={(e) => setTentativeStart(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. premium, urgent"
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <Label>Description</Label>
            <TextArea
              rows={3}
              value={description}
              onChange={setDescription}
            />
          </div>
          <div className="sm:col-span-2 xl:col-span-4">
            <Label>Latest Remark</Label>
            <TextArea
              rows={3}
              value={latestRemark}
              onChange={setLatestRemark}
            />
          </div>
        </div>
      </ComponentCard>

      {(error || success) && (
        <p className={`text-sm ${error ? "text-error-500" : "text-success-600"}`}>
          {error || success}
        </p>
      )}

      <div className="flex gap-3">
        <Button size="sm" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create Lead"}
        </Button>
        <Link href="/sales/leads">
          <Button size="sm" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}
