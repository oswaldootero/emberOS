"use client";

import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!bg-ink-850 !border-white/10 !text-ivory !shadow-cinematic",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
