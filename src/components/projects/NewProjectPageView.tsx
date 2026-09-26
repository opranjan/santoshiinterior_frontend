"use client";

import AddProjectWizard from "@/components/franchisee/AddProjectWizard";
import { useAuth } from "@/context/AuthContext";
import { isFranchiseeUser } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewProjectPageView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const franchisee = isFranchiseeUser(user);

  useEffect(() => {
    if (!loading && !franchisee) router.replace("/projects");
  }, [loading, franchisee, router]);

  if (loading || !franchisee) return null;
  return <AddProjectWizard />;
}
