"use client";

import * as React from "react";
import { toast as sonner } from "sonner";
import { Toaster } from "@/components/ui/sonner";

type ToastKind = "success" | "error" | "info";

/**
 * Thin adapter over shadcn's Sonner so existing call sites keep using
 * `const { toast } = useToast(); toast(msg, "error")`.
 */
function notify(message: string, kind: ToastKind = "info") {
  if (kind === "success") sonner.success(message);
  else if (kind === "error") sonner.error(message);
  else sonner(message);
}

const ToastContext = React.createContext<{
  toast: (message: string, kind?: ToastKind) => void;
}>({ toast: notify });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastContext.Provider value={{ toast: notify }}>
      {children}
      <Toaster position="bottom-right" />
    </ToastContext.Provider>
  );
}
