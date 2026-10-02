"use client";

import FranchiseeProfileSettings from "@/components/franchisee/FranchiseeProfileSettings";
import VendorProfileSettings from "@/components/vendors/VendorProfileSettings";
import UserAddressCard from "@/components/user-profile/UserAddressCard";
import UserInfoCard from "@/components/user-profile/UserInfoCard";
import UserMetaCard from "@/components/user-profile/UserMetaCard";
import { useAuth } from "@/context/AuthContext";
import { isFranchiseeUser, isVendorUser } from "@/lib/permissions";

export default function ProfilePageView() {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-4 text-sm text-gray-500">Loading…</p>;
  if (isFranchiseeUser(user)) return <FranchiseeProfileSettings />;
  if (isVendorUser(user)) return <VendorProfileSettings />;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
        Profile
      </h3>
      <div className="space-y-6">
        <UserMetaCard />
        <UserInfoCard />
        <UserAddressCard />
      </div>
    </div>
  );
}
