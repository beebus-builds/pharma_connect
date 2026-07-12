"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            className: "text-sm",
            style: {
              background: "#1c6256",
              color: "#fff",
            },
            success: { iconTheme: { primary: "#fff", secondary: "#1c6256" } },
            error: { style: { background: "#b91c1c" } },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
