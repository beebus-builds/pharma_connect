import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PharmaConnect - Find Medicines Near You",
  description: "Nepal's platform to search medicines and find the nearest pharmacy with stock in hand.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable} data-scroll-behavior="smooth">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased font-sans">
        <Providers>
          <Navbar />
          <main id="main-content" className="min-h-[calc(100vh-64px)] focus:outline-none" tabIndex={-1}>
            <PageWrapper>
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </PageWrapper>
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
