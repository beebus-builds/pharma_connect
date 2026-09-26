import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "PharmaConnect - Find Medicines Near You",
    template: "%s | PharmaConnect",
  },
  description: "Nepal's platform to search medicines and find the nearest pharmacy with stock in hand.",
  alternates: { canonical: siteUrl },
  openGraph: {
    type: "website",
    siteName: "PharmaConnect",
    title: "PharmaConnect - Find Medicines Near You",
    description: "Search medicines and find the nearest pharmacy with stock in hand across Nepal.",
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "PharmaConnect - Find Medicines Near You",
    description: "Search medicines and find the nearest pharmacy with stock in hand across Nepal.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
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
