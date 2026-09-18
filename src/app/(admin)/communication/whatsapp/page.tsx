"use client";

import React, { Suspense } from "react";
import WhatsAppCommunicationHub from "@/components/leads/WhatsAppCommunicationHub";

function WhatsAppPageContent() {
  return (
    <div className="-mx-4 -mb-4 h-[calc(100dvh-7.25rem)] overflow-hidden md:-mx-6 md:-mb-6 md:h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-5.25rem)]">
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
