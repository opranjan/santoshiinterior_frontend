"use client";

import React, { Suspense } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import WhatsAppCommunicationHub from "@/components/leads/WhatsAppCommunicationHub";

function WhatsAppPageContent() {
  return (
    <div>
      <PageBreadcrumb pageTitle="WhatsApp" />
      <WhatsAppCommunicationHub fullHeight />
    </div>
  );
}

export default function WhatsAppCommunicationPage() {
  return (
    <Suspense
      fallback={
        <div className="py-10 text-sm text-gray-500">Loading WhatsApp…</div>
      }
    >
      <WhatsAppPageContent />
    </Suspense>
  );
}
