"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Moon, Sun, Stethoscope, LogOut, LayoutDashboard, User, HelpCircle, Menu, X } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export default function Navbar() {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardHref =
    session?.user.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/patient";

  const initials = session?.user?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navLinks = status === "authenticated" ? (
    <>
      <Link href="/how-it-works" className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setMobileOpen(false)}>
        <HelpCircle className="h-4 w-4" />
        <span className="sm:hidden">How it Works</span>
      </Link>
      <Link href={dashboardHref} className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setMobileOpen(false)}>
        <LayoutDashboard className="h-4 w-4" />
        <span className="sm:hidden">Dashboard</span>
      </Link>
      <Link href="/profile" className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setMobileOpen(false)}>
        <User className="h-4 w-4" />
        <span className="sm:hidden">Profile</span>
      </Link>
      <Link href="/settings" className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => setMobileOpen(false)}>
        Settings
      </Link>
      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
      <div className="flex items-center gap-2">
        <Link href={dashboardHref} className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-bold hover:ring-2 hover:ring-primary-500 transition-all" title={session.user.name ?? ""}>
          {initials}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="sm:hidden">Sign out</span>
        </button>
      </div>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        onClick={() => setMobileOpen(false)}
      >
        Log in
      </Link>
      <Link
        href="/register"
        className="text-sm font-medium px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-sm transition-all"
        onClick={() => setMobileOpen(false)}
      >
        Sign up
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary-700 dark:text-primary-400 hover:opacity-80 transition-opacity">
          <div className="p-1.5 bg-primary-600 text-white rounded-lg">
            <Stethoscope className="h-5 w-5" />
          </div>
          PharmaConnect
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="hidden sm:flex items-center gap-1">
            {navLinks}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="sm:hidden p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md animate-slideUp">
          <div className="px-4 py-3 flex flex-col gap-1">
            {navLinks}
          </div>
        </div>
      )}
    </header>
  );
}
