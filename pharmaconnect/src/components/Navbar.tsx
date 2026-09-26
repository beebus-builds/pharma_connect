"use client";

import Link from "next/link";
import { useSession } from "@/components/Providers";
import { useState, useEffect, useRef } from "react";
import { Moon, Sun, Stethoscope, LogOut, LayoutDashboard, User, HelpCircle, Menu, X, Settings, MessageCircle, Leaf } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useLiteMode } from "@/hooks/useLiteMode";

export default function Navbar() {
  const { data: session, status, signOut } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { lite, ready: liteReady, setMode: setLiteMode } = useLiteMode();
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

  const navLinks = status === "authenticated" ? (
    <>
      <Link href="/how-it-works" className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30" onClick={() => setMobileOpen(false)}>
        <HelpCircle className="h-4 w-4 shrink-0" />
        How it Works
      </Link>
      <Link href={dashboardHref} className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30" onClick={() => setMobileOpen(false)}>
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        Dashboard
      </Link>
      <Link href="/chat" className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30" onClick={() => setMobileOpen(false)}>
        <MessageCircle className="h-4 w-4 shrink-0" />
        Messages
      </Link>
      <Link href="/profile" className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30" onClick={() => setMobileOpen(false)}>
        <User className="h-4 w-4 shrink-0" />
        Profile
      </Link>
      <Link href="/settings" className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30" onClick={() => setMobileOpen(false)}>
        <Settings className="h-4 w-4 shrink-0" />
        Settings
      </Link>
      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
      <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
        <Link href={dashboardHref} className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-bold hover:ring-2 hover:ring-primary-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 shrink-0" title={session?.user.name ?? ""} aria-label="Go to dashboard">
          {initials || "U"}
        </Link>
        <span className="text-sm font-medium truncate sm:hidden flex-1">{session?.user.name}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 ml-auto sm:ml-0"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
        onClick={() => setMobileOpen(false)}
      >
        Log in
      </Link>
      <Link
        href="/register"
        className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-600/20 hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
        onClick={() => setMobileOpen(false)}
      >
        Sign up
      </Link>
    </>
  );

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 z-[60] bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
        Skip to content
      </a>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-primary-700 dark:text-primary-400 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 rounded-lg">
            <div className="p-1.5 bg-primary-600 text-white rounded-xl shadow-sm">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="tracking-tight">PharmaConnect</span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setLiteMode(!lite)}
              disabled={!liteReady}
              aria-label={`${lite ? "Disable" : "Enable"} lite mode`}
              aria-pressed={lite}
              title={`${lite ? "Disable" : "Enable"} lite mode`}
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
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
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
              aria-label="Toggle menu"
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
