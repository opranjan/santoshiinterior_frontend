"use client";

import React, { useEffect, useMemo, useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import VendorPageHeader from "@/components/vendors/VendorPageHeader";
import { useAuth } from "@/context/AuthContext";
import { designAssetUrl } from "@/lib/designAssets";
import { authApi, vendorsApi, type VendorDto } from "@/services/crmApi";

const fieldClass =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

const card =
  "vendor-card p-5";

function initials(name?: string | null) {
  return String(name || "V")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function value(text?: string | null) {
  return String(text || "").trim() || "—";
}

export default function VendorProfileSettings() {
  const { user, logout, applyUser } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [vendor, setVendor] = useState<VendorDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [photoError, setPhotoError] = useState("");

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setPhone(user.phone || user.vendor?.phone || "");
    setDateOfBirth(user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : "");
  }, [user]);

  useEffect(() => {
    const vendorId = user?.vendorId || user?.vendor?.id;
    if (!vendorId) return;
    vendorsApi
      .get(vendorId)
      .then(setVendor)
      .catch(() => setVendor(null));
  }, [user?.vendorId, user?.vendor?.id]);

  const photo = useMemo(() => designAssetUrl(user?.avatarUrl), [user?.avatarUrl]);
  const company = vendor || user?.vendor;

  const saveProfile = async () => {
    setSaving(true);
    setProfileError("");
    setProfileMsg("");
    try {
      const next = await authApi.updateMe({
        name: name.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth || null,
      });
      applyUser(next);
      setProfileMsg("Profile saved.");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setPasswordError("");
    setPasswordMsg("");
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg("Password updated.");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoError("");
    try {
      const next = await authApi.uploadAvatar(file);
      applyUser(next);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to upload photo");
    }
  };

  const location = [company?.city, company?.state, company?.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-5">
      <VendorPageHeader
        title="Profile"
        subtitle="Your vendor login. Company details come from the CRM vendor record."
      />

      <div className={`${card} flex flex-wrap items-center gap-4`}>
        <label className="relative cursor-pointer">
          <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#111] text-lg font-semibold text-[#c4a574]">
            {photo ? (
              <img src={photo} alt={user?.name || "Profile"} className="h-full w-full object-cover" />
            ) : (
              initials(user?.name || company?.name)
            )}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {user?.name || company?.name || "Vendor"}
            </h2>
            <Badge size="sm" color="info">
              Vendor
            </Badge>
            <Badge size="sm" color={user?.isActive === false ? "error" : "success"}>
              {user?.isActive === false ? "Inactive" : "Active"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-gray-400">
            {company?.name || "Vendor company"}
            {company?.category ? ` · ${company.category}` : ""}
            {location ? ` · ${location}` : ""}
          </p>
          <p className="mt-2 text-xs text-[#9a7748]">Click the photo to upload a new one</p>
          {photoError ? <p className="mt-1 text-xs text-error-500">{photoError}</p> : null}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className={card}>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Personal Information</h3>
          <div className="mt-4 space-y-3">
            <div>
              <p className="mb-1 text-sm text-gray-600">Full name</p>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <p className="mb-1 text-sm text-gray-600">Email (login)</p>
              <input value={user?.email || ""} readOnly className={`${fieldClass} bg-gray-50 dark:bg-gray-800`} />
            </div>
            <div>
              <p className="mb-1 text-sm text-gray-600">Phone</p>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <p className="mb-1 text-sm text-gray-600">Date of birth</p>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <div className={card}>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Vendor company</h3>
          <p className="mt-1 text-xs text-gray-500">Read-only details from the CRM vendor record.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-gray-500">Business name</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value(company?.name)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Contact person</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {value(vendor?.contactPerson || user?.name)}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Company phone</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value(company?.phone)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Company email</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value(company?.email)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">GSTIN</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value(vendor?.gstin || company?.gstin)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-500">Category</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{value(company?.category)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1 text-xs text-gray-500">Address</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {value(
                  [vendor?.address || company?.address, location, vendor?.pincode || company?.pincode]
                    .filter((part) => part && part !== "—")
                    .join(", ")
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {profileError ? <p className="text-sm text-error-500">{profileError}</p> : null}
      {profileMsg ? <p className="text-sm text-success-600">{profileMsg}</p> : null}
      <Button size="sm" onClick={() => void saveProfile()} disabled={saving}>
        {saving ? "Saving…" : "Save Profile"}
      </Button>

      <div className={card}>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Login &amp; Security</h3>
        <p className="mt-1 text-xs text-gray-500">Change the password shared with you.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <p className="mb-1 text-sm text-gray-600">Current password</p>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <p className="mb-1 text-sm text-gray-600">New password</p>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <p className="mb-1 text-sm text-gray-600">Confirm password</p>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={fieldClass} />
          </div>
        </div>
        {passwordError ? <p className="mt-3 text-sm text-error-500">{passwordError}</p> : null}
        {passwordMsg ? <p className="mt-3 text-sm text-success-600">{passwordMsg}</p> : null}
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={() => void savePassword()} disabled={passwordSaving}>
            {passwordSaving ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={logout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
