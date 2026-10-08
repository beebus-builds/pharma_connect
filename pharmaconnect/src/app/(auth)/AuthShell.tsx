import type { InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Stethoscope, ArrowLeft, Eye, EyeOff, ShieldCheck, Store, Users, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface AuthShellProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Rendered under the card, e.g. "No account? Create one". */
  footer?: ReactNode;
  /** True on sign-up, where pharmacy owners are a first-class audience. */
  showAside?: boolean;
}

const ASIDE_POINTS = [
  { icon: ShieldCheck, text: "Every pharmacy listing is license-checked before it gets the Verified badge." },
  { icon: Store, text: "Pharmacy owners manage stock, expiry and MRP from one dashboard." },
  { icon: Users, text: "Searching and browsing stay free — forever." },
];

/**
 * Shared shell for every screen under /login, /register, /forgot-password and
 * /reset-password.
 *
 * The four pages had drifted into four different card treatments and four
 * different page backgrounds, which made a simple sign-in feel like four
 * different products.
 */
export function AuthShell({
  icon: Icon,
  title,
  subtitle,
  children,
  footer,
  showAside,
}: AuthShellProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="mesh pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-10 sm:py-16 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-popover">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="headline font-display text-2xl text-fg sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>}
          </div>

          <Card className="p-6 sm:p-7">{children}</Card>

          {footer && <div className="mt-5 text-center text-sm text-fg-muted">{footer}</div>}

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-fg-subtle transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" />
              Back to search
            </Link>
          </div>
        </div>

        {showAside && (
          <aside className="hidden lg:block">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-fg">
                <Stethoscope className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="font-display text-[1.15rem] font-semibold text-fg">
                PharmaConnect
              </span>
            </Link>
            <h2 className="headline max-w-sm font-display text-3xl text-fg">
              One catalog. Every counter that stocks it.
            </h2>
            <ul className="mt-8 space-y-5">
              {ASIDE_POINTS.map(({ icon: PointIcon, text }) => (
                <li key={text} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <PointIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <p className="max-w-sm text-sm leading-relaxed text-fg-muted">{text}</p>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

/**
 * Password input with a show/hide toggle.
 *
 * The toggle used to be `tabIndex={-1}` and absolutely positioned against a magic
 * `top-[2.1rem]` offset, so keyboard users could not reveal what they had typed
 * and the button drifted out of alignment on any input size other than the one it
 * was written against.
 */
export function PasswordField({
  show,
  onToggle,
  showLabel,
  hideLabel,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  show: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`pr-11 ${props.className ?? ""}`} />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
        aria-label={show ? hideLabel : showLabel}
        aria-pressed={show}
      >
        {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
}
