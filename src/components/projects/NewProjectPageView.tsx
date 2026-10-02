"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewProjectPageView() {
  const { loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace("/projects");
  }, [loading, router]);

  return null;
}
