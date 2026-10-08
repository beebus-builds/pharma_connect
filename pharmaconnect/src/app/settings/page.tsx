"use client";

import { useEffect, useState } from "react";
import { useSession, appToast as toast } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { User, Lock, Mail, Save, Languages, Moon, Sun, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocale } from "@/components/LocaleProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useLiteMode } from "@/hooks/useLiteMode";
import { LOCALES, type Locale } from "@/lib/i18n";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const { t, locale, setLocale } = useLocale();
  const { theme, toggleTheme } = useTheme();
  const { lite, ready: liteReady, setMode: setLiteMode } = useLiteMode();
  const router = useRouter();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<{ password?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user) setName(session.user.name ?? "");
  }, [session]);

  const passwordDirty = password.length > 0;
  const mismatch = passwordDirty && password !== confirmPassword;

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof error = {};
    if (password && password.length < 6) nextErrors.password = t("auth.passwordTooShort");
    if (mismatch) nextErrors.confirm = t("auth.passwordMismatch");
    setError(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const updates: Record<string, string> = { name };
      if (password) updates.password = password;

      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));

      // Refresh the session so the navbar avatar picks up the new name.
      await update();
      toast.success(t("settings.saved"));
      setPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || !session) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
        <span className="sr-only">{t("common.loading")}</span>
      </Container>
    );
  }

  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <SectionHeading
        eyebrow={t("settings.eyebrow")}
        title={t("settings.title")}
        description={t("settings.subtitle")}
        className="mb-7"
      />

      {/* One real <form>, so Enter submits and native validation runs. */}
      <form onSubmit={handleUpdate} className="space-y-5" noValidate>
        <Card className="p-5 sm:p-6">
          <CardTitle icon={User} title={t("settings.personal")} />
          <div className="mt-5 space-y-4">
            <Input
              label={t("auth.fullName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.namePlaceholder")}
              autoComplete="name"
              required
            />
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-fg">{t("auth.email")}</span>
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-sunken px-3.5 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                <span className="truncate text-sm text-fg-muted">{session.user.email}</span>
              </div>
              <p className="text-xs text-fg-subtle">{t("settings.emailLocked")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardTitle icon={Lock} title={t("settings.security")} />
          <p className="mt-1.5 text-sm text-fg-muted">{t("settings.securityBody")}</p>
          <div className="mt-5 space-y-4">
            <Input
              label={t("settings.newPassword")}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("settings.passwordPlaceholder")}
              hint={password ? undefined : t("settings.passwordHint")}
              error={error.password}
            />
            <Input
              label={t("settings.confirmPassword")}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("settings.passwordPlaceholder")}
              error={mismatch ? t("auth.passwordMismatch") : error.confirm}
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <CardTitle icon={Languages} title={t("settings.appearance")} />
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{t("settings.language")}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{t("settings.languageBody")}</p>
              </div>
              <div
                className="flex shrink-0 rounded-xl border border-line bg-surface-sunken p-0.5"
                role="group"
                aria-label={t("settings.language")}
              >
                {LOCALES.map((code: Locale) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLocale(code)}
                    aria-pressed={locale === code}
                    className={`rounded-[0.625rem] px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
                      locale === code
                        ? "bg-surface text-fg shadow-card"
                        : "text-fg-muted hover:text-fg"
                    }`}
                  >
                    {code === "en" ? "English" : "नेपाली"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{t("settings.theme")}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{t("settings.themeBody")}</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
                {theme === "dark" ? t("nav.themeLight") : t("nav.themeDark")}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg">{t("settings.liteMode")}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{t("settings.liteModeBody")}</p>
              </div>
              <Button
                type="button"
                variant={lite ? "primary" : "secondary"}
                size="sm"
                disabled={!liteReady}
                onClick={() => setLiteMode(!lite)}
                aria-pressed={lite}
              >
                {lite ? t("nav.liteModeOff") : t("nav.liteModeOn")}
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} disabled={mismatch}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? t("common.saving") : t("settings.save")}
          </Button>
        </div>
      </form>
    </Container>
  );
}

/** Small heading row used inside the settings cards. */
function CardTitle({ icon: Icon, title }: { icon: typeof User; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 font-display text-base font-semibold text-fg">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      {title}
    </h2>
  );
}
