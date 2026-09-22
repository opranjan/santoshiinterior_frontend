"use client";

import { useSearchParams } from "next/navigation";
import React from "react";
import RfqDetail from "@/components/procurement/RfqDetail";
import RfqEditor from "@/components/procurement/RfqEditor";

export default function RfqPage({ id }: { id: string }) {
  const searchParams = useSearchParams();
  if (searchParams.get("new") === "1") return <RfqEditor id={id} />;
  return <RfqDetail id={id} />;
}
