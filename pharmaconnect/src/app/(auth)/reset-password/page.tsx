"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { appToast as toast } from "@/components/Providers";
import { Link2Off, LockKeyhole } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button, buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLocale } from "@/components/LocaleProvider";
import { AuthShell, PasswordField } from "../AuthShell";
import Link from "next/link";

function ResetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ password?: string; confirm?: string }>({});

  // Validation runs against the field, not the toast: a toast disappears before
  // the reader gets their eyes back to the form.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof error = {};
    if (password.length < 6) nextErrors.password = t("auth.passwordTooShort");
    if (password !== confirm) nextErrors.confirm = t("auth.passwordMismatch");
    setError(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      toast.success(t("auth.passwordUpdated"));
      router.push("/login?reset=done");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <AuthShell icon={Link2Off} title={t("auth.missingToken.title")}>
        <EmptyState
          icon={Link2Off}
          title={t("auth.missingToken.title")}
          body={t("auth.missingToken.body")}
          action={
            <Link href="/forgot-password" className={buttonClasses()}>
              {t("auth.missingToken.cta")}
            </Link>
          }
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell icon={LockKeyhole} title={t("auth.newPassword")} subtitle={t("auth.newPasswordHint")}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="reset-password" className="block text-sm font-medium text-fg">
            {t("auth.newPassword")}
          </label>
          <PasswordField
            id="reset-password"
            autoComplete="new-password"
            placeholder="••••••••"
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            showLabel={t("auth.showPassword")}
            hideLabel={t("auth.hidePassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error.password ? true : undefined}
            className="h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-fg shadow-xs transition-[box-shadow,border-color] duration-200 placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
          />
          {error.password && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {error.password}
            </p>
          )}
        </div>

        <Input
          label={t("auth.confirmPassword")}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={error.confirm}
        />

        <Button type="submit" block loading={saving}>
          {t("auth.updatePassword")}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-canvas" />}>
      <ResetInner />
    </Suspense>
  );
}
