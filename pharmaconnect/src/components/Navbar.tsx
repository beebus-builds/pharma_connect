"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/Providers";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Moon,
  Sun,
  Stethoscope,
  LogOut,
  LayoutDashboard,
  User,
  HelpCircle,
  Menu,
  X,
  Settings,
  MessageCircle,
  Leaf,
  ChevronDown,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useLiteMode } from "@/hooks/useLiteMode";
import { useLocale } from "@/components/LocaleProvider";
import LocaleToggle from "@/components/LocaleToggle";
import { Avatar } from "@/components/ui/Feedback";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof User;
  /** Also treat nested routes (e.g. /chat/abc) as active. */
  prefix?: boolean;
}

export default function Navbar() {
  const { data: session, status, signOut } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { lite, ready: liteReady, setMode: setLiteMode } = useLiteMode();
  const { t } = useLocale();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const dashboardHref =
    session?.user.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/patient";

  const isSignedIn = status === "authenticated";
  const isAdmin = session?.user.role === "ADMIN";

  // Only elevate the bar once the page has actually scrolled — a permanent
  // shadow on a static header reads as "modal", not as chrome.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const closeAll = useCallback(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, []);

  // Route change closes every transient surface.
  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
      setMobileOpen(false);
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuOpen && menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  // Lock background scroll while the mobile sheet is open. The Dialog primitive
  // does this for modals; the nav sheet predates it and still needs its own.
  useEffect(() => {
    if (!mobileOpen) return;
    const { overflow, paddingRight } = document.body.style;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [mobileOpen]);

  const isActive = (item: NavItem) =>
    item.prefix ? pathname.startsWith(item.href) : pathname === item.href;

  const primaryLinks: NavItem[] = isSignedIn
    ? [
        { href: dashboardHref, label: t("nav.dashboard"), icon: LayoutDashboard },
        { href: "/chat", label: t("nav.messages"), icon: MessageCircle, prefix: true },
        { href: "/how-it-works", label: t("nav.howItWorks"), icon: HelpCircle },
      ]
    : [
        { href: "/how-it-works", label: t("nav.howItWorks"), icon: HelpCircle },
        { href: "/for-pharmacies", label: t("nav.forPharmacies"), icon: Store },
        { href: "/medicines", label: t("footer.searchMedicines"), icon: Stethoscope },
      ];

  const accountLinks: NavItem[] = [
    { href: "/profile", label: t("nav.profile"), icon: User },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
    ...(isAdmin ? [{ href: "/admin", label: t("nav.admin"), icon: ShieldCheck }] : []),
  ];

  const linkBase =
    "relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring";

  const renderPrimaryLinks = (variant: "desktop" | "mobile") =>
    primaryLinks.map(({ href, label, icon: Icon, prefix }) => {
      const active = isActive({ href, label, icon: Icon, prefix });
      return (
        <Link
          key={href}
          href={href}
          aria-current={active ? "page" : undefined}
          className={cn(
            linkBase,
            variant === "mobile" && "w-full justify-start px-3 py-2.5 text-[0.9375rem]",
            active
              ? "text-accent"
              : "text-fg-muted hover:bg-surface-sunken hover:text-fg"
          )}
        >
          <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
          {label}
        </Link>
      );
    });

  const renderAccountLinks = () =>
    accountLinks.map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        role="menuitem"
        aria-current={isActive({ href, label, icon: Icon }) ? "page" : undefined}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        {label}
      </Link>
    ));

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-accent-fg"
      >
        {t("nav.skipToContent")}
      </a>

      <header
        className={cn(
          "sticky top-0 z-50 transition-[box-shadow,border-color,background-color] duration-300",
          scrolled
            ? "surface-glass border-b shadow-card"
            : "border-b border-transparent bg-canvas/60 backdrop-blur-sm"
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="container-app flex h-16 items-center justify-between !px-4">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-xs transition-transform duration-300 ease-spring group-hover:scale-105 motion-reduce:transition-none">
              <Stethoscope className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <span className="font-display text-[1.15rem] font-semibold tracking-tight text-fg">
              PharmaConnect
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <LocaleToggle />

            {/* Utility toggles only earn header space on desktop; on phones they
                live in the mobile sheet so the logo + menu stay uncrowded. */}
            <div className="hidden items-center gap-0.5 sm:flex">
              <button
                onClick={() => setLiteMode(!lite)}
                disabled={!liteReady}
                aria-label={lite ? t("nav.liteModeOff") : t("nav.liteModeOn")}
                aria-pressed={lite}
                title={lite ? t("nav.liteModeOff") : t("nav.liteModeOn")}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring disabled:cursor-wait disabled:opacity-50",
                  lite
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "text-fg-muted hover:bg-surface-sunken hover:text-fg"
                )}
              >
                <Leaf className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")}
                title={theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>

            <nav className="hidden items-center gap-0.5 sm:flex" aria-label="Primary">
              {renderPrimaryLinks("desktop")}
            </nav>

            {isSignedIn ? (
              <div className="relative ml-1" ref={menuRef}>
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-1.5 rounded-full p-0.5 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  <Avatar name={session?.user.name ?? "User"} size="sm" />
                  <ChevronDown
                    className={cn(
                      "hidden h-3.5 w-3.5 text-fg-subtle transition-transform duration-200 sm:block",
                      menuOpen && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                  <span className="sr-only">{t("nav.accountMenu")}</span>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    aria-label={t("nav.accountMenu")}
                    className="absolute right-0 z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-overlay animate-scaleIn motion-reduce:animate-none"
                  >
                    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                      <Avatar name={session?.user.name ?? "User"} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">
                          {session?.user.name}
                        </p>
                        <p className="truncate text-xs text-fg-subtle">{session?.user.email}</p>
                      </div>
                    </div>
                    <div className="my-1.5 h-px bg-line" role="none" />
                    <Link
                      href={dashboardHref}
                      role="menuitem"
                      onClick={closeAll}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                    >
                      <LayoutDashboard className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                      {t("nav.dashboard")}
                    </Link>
                    {renderAccountLinks()}
                    <div className="my-1.5 h-px bg-line" role="none" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void signOut({ callbackUrl: "/" })}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {t("nav.signOut")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="ml-1.5 flex items-center gap-2">
                <Link
                  href="/login"
                  className={cn(buttonBase, "hidden sm:inline-flex")}
                >
                  {t("nav.login")}
                </Link>
                <Link href="/register" className={buttonClasses({ size: "sm" })}>
                  {t("nav.signup")}
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring sm:hidden"
              aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.toggleMenu")}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 top-16 z-40 bg-slate-950/30 backdrop-blur-sm animate-fadeIn motion-reduce:animate-none sm:hidden"
              onClick={closeAll}
              aria-hidden="true"
            />
            <div
              id="mobile-menu"
              ref={mobileRef}
              className="relative z-50 overflow-hidden border-b border-line bg-surface shadow-overlay animate-slideUp motion-reduce:animate-none sm:hidden"
            >
              <nav
                aria-label="Mobile"
                className="mx-auto flex max-h-[calc(100dvh-4rem)] w-full max-w-6xl flex-col gap-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4"
              >
                {renderPrimaryLinks("mobile")}

                {isSignedIn && (
                  <div className="mt-3 border-t border-line pt-3">
                    <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
                      {session?.user.name}
                    </p>
                    {renderAccountLinks()}
                  </div>
                )}

                {!isSignedIn && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
                    <Link href="/login" className={buttonClasses({ variant: "secondary", block: true })}>
                      {t("nav.login")}
                    </Link>
                    <Link href="/register" className={buttonClasses({ block: true })}>
                      {t("nav.signup")}
                    </Link>
                  </div>
                )}

                {/* Display controls duplicated here for phones, where the header
                    hides them to protect the logo and menu button. */}
                <div className="mt-3 flex items-center gap-2 border-t border-line pt-4">
                  <button
                    onClick={() => setLiteMode(!lite)}
                    disabled={!liteReady}
                    aria-pressed={lite}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-sunken px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors disabled:opacity-50"
                  >
                    <Leaf className="h-4 w-4" aria-hidden="true" />
                    {lite ? t("nav.liteModeOff") : t("nav.liteModeOn")}
                  </button>
                  <button
                    onClick={toggleTheme}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-surface-sunken px-3 py-2.5 text-sm font-medium text-fg-muted transition-colors"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Moon className="h-4 w-4" aria-hidden="true" />
                    )}
                    {theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")}
                  </button>
                </div>
              </nav>
            </div>
          </>
        )}
      </header>
    </>
  );
}

const buttonBase =
  "inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-semibold text-fg-muted " +
  "transition-colors hover:bg-surface-sunken hover:text-fg " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring";
