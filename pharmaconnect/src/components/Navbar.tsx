"use client";

import Link from "next/link";
import { useSession } from "@/components/Providers";
import { useState, useEffect, useRef } from "react";
import { Moon, Sun, Stethoscope, LogOut, LayoutDashboard, User, HelpCircle, Menu, X, Settings, MessageCircle, Leaf } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useLiteMode } from "@/hooks/useLiteMode";
import { useLocale } from "@/components/LocaleProvider";
import LocaleToggle from "@/components/LocaleToggle";

export default function Navbar() {
  const { data: session, status, signOut } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { lite, ready: liteReady, setMode: setLiteMode } = useLiteMode();
  const { t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const dashboardHref =
    session?.user.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/patient";

  const initials = session?.user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && mobileOpen) {
        // check if click is outside header's mobile button
        const header = document.querySelector("header");
        if (header && !header.contains(e.target as Node)) setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [mobileOpen]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const linkBase =
    "flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30";

  const navLinks = status === "authenticated" ? (
    <>
      <Link href="/how-it-works" className={linkBase} onClick={() => setMobileOpen(false)}>
        <HelpCircle className="h-4 w-4 shrink-0 text-slate-400" />
        {t("nav.howItWorks")}
      </Link>
      <Link href={dashboardHref} className={linkBase} onClick={() => setMobileOpen(false)}>
        <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-400" />
        {t("nav.dashboard")}
      </Link>
      <Link href="/chat" className={linkBase} onClick={() => setMobileOpen(false)}>
        <MessageCircle className="h-4 w-4 shrink-0 text-slate-400" />
        {t("nav.messages")}
      </Link>
      <Link href="/profile" className={linkBase} onClick={() => setMobileOpen(false)}>
        <User className="h-4 w-4 shrink-0 text-slate-400" />
        {t("nav.profile")}
      </Link>
      <Link href="/settings" className={linkBase} onClick={() => setMobileOpen(false)}>
        <Settings className="h-4 w-4 shrink-0 text-slate-400" />
        {t("nav.settings")}
      </Link>
      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
      <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
        <Link href={dashboardHref} className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-b from-primary-500 to-primary-600 text-white text-xs font-bold shadow-md shadow-primary-600/25 hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 shrink-0 ring-1 ring-inset ring-white/25" title={session?.user.name ?? ""} aria-label="Go to dashboard">
          {initials || "U"}
        </Link>
        <span className="text-sm font-medium truncate sm:hidden flex-1">{session?.user.name}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 ml-auto sm:ml-0"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          {t("nav.signOut")}
        </button>
      </div>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="text-sm font-medium px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
        onClick={() => setMobileOpen(false)}
      >
        {t("nav.login")}
      </Link>
      <Link
        href="/register"
        className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-gradient-to-b from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-[0_8px_24px_-8px_rgb(39_150_129/0.5)] hover:shadow-[0_12px_32px_-8px_rgb(39_150_129/0.55)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ring-1 ring-inset ring-white/20"
        onClick={() => setMobileOpen(false)}
      >
        {t("nav.signup")}
      </Link>
    </>
  );

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-[60] bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
        {t("nav.skipToContent")}
      </a>
      <header className="sticky top-0 z-50 border-b border-slate-200/70 dark:border-slate-800/70 glass">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded-xl">
            <div className="p-2 bg-gradient-to-b from-primary-500 to-primary-600 text-white rounded-xl shadow-[0_8px_20px_-8px_rgb(39_150_129/0.6)] ring-1 ring-inset ring-white/25 group-hover:shadow-[0_10px_28px_-8px_rgb(39_150_129/0.65)] transition-shadow">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-bold text-[1.15rem] tracking-tight text-slate-900 dark:text-white">Pharma<span className="text-gradient">Connect</span></span>
          </Link>

          <div className="flex items-center gap-1">
            <LocaleToggle />

            <button
              onClick={() => setLiteMode(!lite)}
              disabled={!liteReady}
              aria-label={lite ? t("nav.liteModeOff") : t("nav.liteModeOn")}
              aria-pressed={lite}
              title={lite ? t("nav.liteModeOff") : t("nav.liteModeOn")}
              className={`p-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 disabled:cursor-wait disabled:opacity-50 ${
                lite
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Leaf className="h-4 w-4" />
            </button>

            <button
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <nav className="hidden sm:flex items-center gap-1" aria-label="Primary">
              {navLinks}
            </nav>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
              aria-label={t("nav.toggleMenu")}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <>
            <div className="sm:hidden fixed inset-0 top-16 bg-slate-900/20 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div
              id="mobile-menu"
              ref={menuRef}
              className="sm:hidden relative z-50 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-xl animate-slideUp"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="px-4 py-4 flex flex-col gap-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
                {navLinks}
              </div>
            </div>
          </>
        )}
      </header>
    </>
  );
}
