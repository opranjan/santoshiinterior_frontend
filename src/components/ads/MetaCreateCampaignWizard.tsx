"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import MetaAdsShell from "@/components/ads/MetaAdsShell";
import {
  metaLeadAdsApi,
  type MetaAdsPublishResultDto,
  type MetaLeadFormDto,
} from "@/services/crmApi";

const STEPS = [
  { id: 1, label: "Objective" },
  { id: 2, label: "Audience" },
  { id: 3, label: "Budget" },
  { id: 4, label: "Creative" },
  { id: 5, label: "Review" },
] as const;

type FormState = {
  name: string;
  objective: "OUTCOME_LEADS";
  ageMin: number;
  ageMax: number;
  countries: string;
  gender: "all" | "male" | "female";
  dailyBudget: number;
  startTime: string;
  endTime: string;
  primaryText: string;
  headline: string;
  description: string;
  ctaType: string;
  imageUrl: string;
  imageBase64: string;
  imageName: string;
  leadFormId: string;
  formName: string;
  privacyUrl: string;
  status: "PAUSED" | "ACTIVE";
};

const initial: FormState = {
  name: "",
  objective: "OUTCOME_LEADS",
  ageMin: 25,
  ageMax: 55,
  countries: "IN",
  gender: "all",
  dailyBudget: 500,
  startTime: "",
  endTime: "",
  primaryText: "",
  headline: "",
  description: "",
  ctaType: "SIGN_UP",
  imageUrl: "",
  imageBase64: "",
  imageName: "",
  leadFormId: "",
  formName: "",
  privacyUrl: "",
  status: "PAUSED",
};

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((s) => {
        const done = step > s.id;
        const active = step === s.id;
        return (
          <li
            key={s.id}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
              active
                ? "bg-orange-600 text-white"
                : done
                  ? "bg-orange-50 text-orange-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                active ? "bg-white/20" : done ? "bg-orange-200" : "bg-slate-200"
              }`}
            >
              {s.id}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

export default function MetaCreateCampaignWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
  const [forms, setForms] = useState<MetaLeadFormDto[]>([]);
  const [formsError, setFormsError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MetaAdsPublishResultDto | null>(null);

  useEffect(() => {
    metaLeadAdsApi
      .listLeadForms()
      .then((data) => setForms(data.items || []))
      .catch((err) =>
        setFormsError(err instanceof Error ? err.message : "Could not load lead forms")
      );
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canNext = useMemo(() => {
    if (step === 1) return form.name.trim().length >= 2;
    if (step === 2) return form.ageMin >= 18 && form.ageMax >= form.ageMin;
    if (step === 3) return form.dailyBudget > 0;
    if (step === 4) {
      return Boolean(
        form.primaryText.trim() &&
          form.headline.trim() &&
          (form.imageUrl.trim() || form.imageBase64.trim())
      );
    }
    return true;
  }, [form, step]);

  const onFile = async (file: File | null) => {
    if (!file) {
      set("imageBase64", "");
      set("imageName", "");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      set("imageBase64", String(reader.result || ""));
      set("imageName", file.name);
      set("imageUrl", "");
    };
    reader.readAsDataURL(file);
  };

  const publish = async () => {
    try {
      setPublishing(true);
      setError("");
      const countries = form.countries
        .split(/[,\s]+/)
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);
      const created = await metaLeadAdsApi.publishFullLeadAd({
        name: form.name.trim(),
        objective: form.objective,
        status: form.status,
        dailyBudget: form.dailyBudget,
        ageMin: form.ageMin,
        ageMax: form.ageMax,
        countries: countries.length ? countries : ["IN"],
        gender: form.gender,
        primaryText: form.primaryText.trim(),
        headline: form.headline.trim(),
        description: form.description.trim() || undefined,
        ctaType: form.ctaType,
        imageUrl: form.imageUrl.trim() || undefined,
        imageBase64: form.imageBase64 || undefined,
        imageName: form.imageName || undefined,
        leadFormId: form.leadFormId || undefined,
        formName: form.formName.trim() || undefined,
        privacyUrl: form.privacyUrl.trim() || undefined,
        startTime: form.startTime
          ? new Date(form.startTime).toISOString()
          : undefined,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
      });
      setResult(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  if (result) {
    return (
      <MetaAdsShell hideCreate title="Campaign published">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">
            ✓
          </div>
          <h3 className="mt-4 text-xl font-semibold text-slate-900">{result.campaignName}</h3>
          <p className="mt-2 text-sm text-slate-500">
            Instant Form lead ad created on Meta · status {result.metaStatus}
          </p>
          <dl className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-xs text-slate-600">
            <div className="flex justify-between gap-3">
              <dt>Campaign</dt>
              <dd className="font-mono">{result.campaignId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Ad set</dt>
              <dd className="font-mono">{result.adsetId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Form</dt>
              <dd className="font-mono">{result.formId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Ad</dt>
              <dd className="font-mono">{result.adId}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href={`/ads/meta/campaigns?key=${encodeURIComponent(result.key)}`}
              className="inline-flex h-10 items-center rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white"
            >
              Open campaign
            </Link>
            <Link
              href="/ads/meta/adsets"
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700"
            >
              View ad sets
            </Link>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setForm(initial);
                setStep(1);
              }}
              className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700"
            >
              Create another
            </button>
          </div>
        </div>
      </MetaAdsShell>
    );
  }

  return (
    <MetaAdsShell hideCreate title="Create Campaign" subtitle="5 steps · Instant Form lead ads on Meta">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Stepper step={step} />

        <div className="mt-6 space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Campaign name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Goa Lead Ads — March"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Objective
                </label>
                <div className="rounded-xl border-2 border-orange-500 bg-orange-50 p-4">
                  <p className="font-semibold text-slate-900">Lead Generation</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Instant Form on Facebook / Instagram. Leads sync into CRM Lead Ads.
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Traffic / Awareness full publish paths come later — this wizard publishes Instant
                  Form lead ads only.
                </p>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Age min
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={form.ageMin}
                    onChange={(e) => set("ageMin", Number(e.target.value) || 18)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Age max
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={form.ageMax}
                    onChange={(e) => set("ageMax", Number(e.target.value) || 55)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Countries (ISO codes)
                </label>
                <input
                  value={form.countries}
                  onChange={(e) => set("countries", e.target.value)}
                  placeholder="IN"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value as FormState["gender"])}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="all">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Daily budget (INR)
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.dailyBudget}
                  onChange={(e) => set("dailyBudget", Number(e.target.value) || 0)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Sent to Meta as minor units (₹ × 100).
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Start (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => set("startTime", e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    End (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => set("endTime", e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                  />
                </div>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Primary text
                </label>
                <textarea
                  value={form.primaryText}
                  onChange={(e) => set("primaryText", e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm"
                  placeholder="Main ad copy"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Headline
                  </label>
                  <input
                    value={form.headline}
                    onChange={(e) => set("headline", e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    CTA
                  </label>
                  <select
                    value={form.ctaType}
                    onChange={(e) => set("ctaType", e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <option value="SIGN_UP">Sign up</option>
                    <option value="LEARN_MORE">Learn more</option>
                    <option value="GET_QUOTE">Get quote</option>
                    <option value="APPLY_NOW">Apply now</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Description (optional)
                </label>
                <input
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Image URL
                  </label>
                  <input
                    value={form.imageUrl}
                    onChange={(e) => {
                      set("imageUrl", e.target.value);
                      if (e.target.value) {
                        set("imageBase64", "");
                        set("imageName", "");
                      }
                    }}
                    placeholder="https://…"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Or upload image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void onFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-slate-600"
                  />
                  {form.imageName ? (
                    <p className="mt-1 text-xs text-emerald-700">Selected: {form.imageName}</p>
                  ) : null}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Instant Form
                </label>
                <select
                  value={form.leadFormId}
                  onChange={(e) => set("leadFormId", e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="">Create new form on publish</option>
                  {forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.id})
                    </option>
                  ))}
                </select>
                {formsError ? <p className="mt-1 text-xs text-amber-700">{formsError}</p> : null}
                {!form.leadFormId ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      value={form.formName}
                      onChange={(e) => set("formName", e.target.value)}
                      placeholder="New form name"
                      className="h-11 rounded-xl border border-slate-200 px-3.5 text-sm"
                    />
                    <input
                      value={form.privacyUrl}
                      onChange={(e) => set("privacyUrl", e.target.value)}
                      placeholder="Privacy policy URL (optional)"
                      className="h-11 rounded-xl border border-slate-200 px-3.5 text-sm"
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Name:</span> {form.name}
              </p>
              <p>
                <span className="font-semibold">Audience:</span> {form.ageMin}–{form.ageMax},{" "}
                {form.countries || "IN"}, {form.gender}
              </p>
              <p>
                <span className="font-semibold">Budget:</span> ₹{form.dailyBudget}/day
              </p>
              <p>
                <span className="font-semibold">Creative:</span> {form.headline} · {form.ctaType}
              </p>
              <p>
                <span className="font-semibold">Form:</span>{" "}
                {form.leadFormId || form.formName || "New Instant Form"}
              </p>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Publish status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as "PAUSED" | "ACTIVE")}
                  className="h-11 w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="PAUSED">Paused (recommended)</option>
                  <option value="ACTIVE">Active (starts spending)</option>
                </select>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => (step === 1 ? router.push("/ads/meta/campaigns") : setStep((s) => s - 1))}
            className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-700"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 5 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex h-10 items-center rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={publishing || !canNext}
              onClick={() => void publish()}
              className="inline-flex h-10 items-center rounded-xl bg-orange-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
            >
              {publishing ? "Publishing on Meta…" : "Publish lead ad"}
            </button>
          )}
        </div>
      </div>
    </MetaAdsShell>
  );
}
