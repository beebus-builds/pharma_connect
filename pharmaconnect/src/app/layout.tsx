import type { Metadata } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "PharmaConnect - Find Medicines Near You",
  description: "Nepal's platform to search medicines and find the nearest pharmacy with stock in hand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased">
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
