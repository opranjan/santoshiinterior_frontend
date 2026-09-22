"use client";

import { Toaster, toast } from "sonner";

export function toastError(message: string, title = "Error") {
  toast.error(title, { description: message });
}

export function toastSuccess(message: string, title = "Success") {
  toast.success(title, { description: message });
}

export function toastWarning(message: string, title = "Required") {
  toast.warning(title, { description: message });
}

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
      offset={16}
      style={{ zIndex: 999999 }}
      toastOptions={{
        className: "font-sans",
      }}
    />
  );
}
