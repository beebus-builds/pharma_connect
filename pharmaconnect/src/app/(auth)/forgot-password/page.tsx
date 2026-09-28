"use client";

import { useState } from "react";
import Link from "next/link";
import { appToast as toast } from "@/components/Providers";
import { KeyRound } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/LocaleProvider";

export default function ForgotPasswordPage() {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSent(true);
      toast.success(t("auth.linkSent"));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-slate-950 dark:via-slate-900 dark:to-primary-950">
      <div className="w-full max-w-md mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-2xl shadow-lg mb-4">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">{t("auth.forgotTitle")}</h1>
          <p className="text-slate-500 mt-1">{t("auth.forgotSubtitle")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-xl border border-slate-200/50 p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {t("auth.linkSent")} <strong>{email}</strong>
              </p>
              <Link href="/login" className="text-primary-600 font-semibold text-sm">
                {t("auth.backToLogin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <Input
                label={t("auth.email")}
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" loading={sending} className="w-full">
                {t("auth.sendResetLink")}
              </Button>
              <div className="text-center text-sm text-slate-500">
                {t("nav.login")}{" "}
                <Link href="/login" className="text-primary-600 font-semibold">
                  {t("auth.signIn")}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
