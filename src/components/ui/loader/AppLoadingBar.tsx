"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { subscribeApiLoading } from "@/lib/api";

export default function AppLoadingBar() {
  const pathname = usePathname();
  const [apiBusy, setApiBusy] = useState(false);
  const [navBusy, setNavBusy] = useState(false);

  useEffect(() => subscribeApiLoading(setApiBusy), []);

  useEffect(() => {
    setNavBusy(true);
    const timer = window.setTimeout(() => setNavBusy(false), 450);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const show = apiBusy || navBusy;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100000] h-[3px] overflow-hidden transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      role="progressbar"
      aria-hidden={!show}
      aria-valuetext={show ? "Loading" : undefined}
    >
      <div className="crm-shimmer-bar h-full w-full" />
    </div>
  );
}
