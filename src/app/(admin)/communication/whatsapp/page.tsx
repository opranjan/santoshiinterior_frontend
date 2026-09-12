"use client";

import React, { Suspense } from "react";
import WhatsAppCommunicationHub from "@/components/leads/WhatsAppCommunicationHub";

function WhatsAppPageContent() {
  return (
    <div className="-mx-4 -mb-4 h-[calc(100dvh-4.75rem)] md:-mx-6 md:-mb-6 lg:h-[calc(100dvh-5.25rem)]">
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
