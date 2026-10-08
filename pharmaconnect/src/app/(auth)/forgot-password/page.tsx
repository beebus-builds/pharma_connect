"use client";

import { useState } from "react";
import Link from "next/link";
import { appToast as toast } from "@/components/Providers";
import { KeyRound, Mail, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/LocaleProvider";
import { AuthShell } from "../AuthShell";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      setSent(true);
      toast.success(t("auth.linkSent"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthShell
      icon={KeyRound}
      title={t("auth.forgotTitle")}
      subtitle={t("auth.forgotSubtitle")}
      footer={
        <>
          {t("nav.login")}{" "}
          <Link
            href="/login"
            className="rounded font-semibold text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            {t("auth.signIn")}
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <div className="flex items-start gap-3.5 rounded-xl bg-accent-soft px-4 py-4">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{t("auth.linkSentTitle")}</p>
              <p className="mt-1 text-sm text-fg-muted">
                {t("auth.linkSentTo", { email })}
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-fg-subtle">{t("auth.linkSentHint")}</p>
          <Button variant="secondary" block onClick={() => setSent(false)}>
            {t("auth.useDifferentEmail")}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input
            label={t("auth.email")}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            leading={<Mail />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" block loading={sending}>
            {sending ? t("auth.sending") : t("auth.sendResetLink")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
