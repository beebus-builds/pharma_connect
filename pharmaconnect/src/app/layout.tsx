import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageWrapper from "@/components/PageWrapper";
import OfflineManager from "@/components/OfflineManager";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  // Optical sizing is what makes Fraunces look right at 44px and at 14px;
  // without it the hero headline renders noticeably heavier than the design.
  axes: ["SOFT", "WONK"],
});

const sans = Public_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: "/manifest.webmanifest",
  applicationName: "PharmaConnect",
  appleWebApp: {
    capable: true,
    title: "PharmaConnect",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  title: {
    default: "PharmaConnect - Find Medicines Near You",
    template: "%s | PharmaConnect",
  },
  description:
    "Nepal's platform to search medicines and find the nearest pharmacy with stock in hand.",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available: this is a utility people read at arm's length.
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b100f" },
  ],
  colorScheme: "light dark",
};

/**
 * Applies the stored theme before first paint.
 *
 * `ThemeProvider` runs in an effect, which meant every cold load painted the
 * light theme first and then snapped to dark — a full-page flash for anyone who
 * had chosen dark. This inline script is the standard fix: it runs during HTML
 * parsing, before the browser paints anything.
 */
const themeScript = `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='dark'||s==='light'?s:(d?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-fg antialiased">
        <Providers>
          <Navbar />
          <main id="main-content" className="min-h-[60vh] focus:outline-none" tabIndex={-1}>
            <PageWrapper>
              <ErrorBoundary>{children}</ErrorBoundary>
            </PageWrapper>
          </main>
          <Footer />
          <OfflineManager />
        </Providers>
      </body>
    </html>
  );
}
