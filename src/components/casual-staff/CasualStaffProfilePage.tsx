"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { casualApi } from "@/services/crmApi";
import { designAssetUrl } from "@/lib/designAssets";

export default function CasualStaffProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await casualApi.updateProfile({ name, phone });
      await refreshUser();
      setSaved("Profile saved.");
      window.setTimeout(() => setSaved(""), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c4a574]">Casual › Profile</p>
      <h1 className="mt-1 font-serif text-[1.75rem] text-[#1c1610]" style={{ fontFamily: "Georgia, serif" }}>
        Profile
      </h1>
      <div className="mt-5 max-w-xl rounded-2xl border border-[#eadfcf] bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[#c4a574] text-lg font-semibold text-[#1c1610]">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={designAssetUrl(user.avatarUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              String(user?.name || "CS")
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            )}
          </span>
          <div>
            <p className="font-semibold text-[#1c1610]">{user?.name}</p>
            <p className="text-sm text-[#8a7b68]">Casual Staff</p>
          </div>
        </div>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-[#8a7b68]">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#eadfcf] px-3 outline-none focus:border-[#c4a574]"
          />
        </label>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-[#8a7b68]">Phone</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 w-full rounded-xl border border-[#eadfcf] px-3 outline-none focus:border-[#c4a574]"
          />
        </label>
        <p className="mb-4 text-sm text-[#8a7b68]">{user?.email}</p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="h-11 rounded-xl bg-[#c4a574] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {saved ? <p className="mt-3 text-sm text-emerald-700">{saved}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
