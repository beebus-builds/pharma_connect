"use client";

import { useEffect, useState } from "react";
import { CircleCheck, TriangleAlert, Mail, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Feedback";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/ui/Container";
import { useLocale } from "@/components/LocaleProvider";
import { appToast as toast } from "@/components/Providers";
import Link from "next/link";

type Status = "loading" | "success" | "error";

export default function VerifyPage() {
  const { t } = useLocale();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  async function resend() {
    if (!email.trim()) {
      toast.error(t("auth.emailRequiredFirst"));
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      toast.success(data.message || t("auth.verificationSent"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function verify() {
      const token = new URLSearchParams(window.location.search).get("token");

      if (!token) {
        setStatus("error");
        setMessage(t("verify.noToken"));
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify?token=${encodeURIComponent(token)}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          setExpired(Boolean(data.expired));
          throw new Error(data.error || t("verify.failed"));
        }

        setStatus("success");
        setMessage(t("verify.successBody"));
        toast.success(t("verify.successToast"));
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : t("verify.failed"));
      }
    }

    void verify();
    return () => controller.abort();
    // Runs once per page load; `t` is intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-16">
      <Card className="w-full max-w-md p-7 text-center sm:p-8">
        <div aria-live="polite" aria-busy={status === "loading"}>
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-9 w-9 animate-spin text-accent" aria-hidden="true" />
              <p className="text-sm text-fg-muted">{t("verify.checking")}</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CircleCheck className="h-7 w-7" aria-hidden="true" />
              </span>
              <h1 className="font-display text-2xl font-semibold text-fg">
                {t("verify.successTitle")}
              </h1>
              <p className="text-sm leading-relaxed text-fg-muted">{message}</p>
              <Link href="/login" className={buttonClasses({ block: true })}>
                {t("auth.signIn")}
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-5">
              <EmptyState
                tone="error"
                icon={TriangleAlert}
                title={t("verify.failedTitle")}
                body={message}
                className="border-0 bg-transparent px-0 py-2"
              />

              {expired && (
                <Alert tone="warning" title={t("verify.expiredTitle")}>
                  {t("verify.expiredBody")}
                </Alert>
              )}

              <div className="space-y-2 text-left">
                <Input
                  label={t("auth.email")}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  leading={<Mail />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  variant="secondary"
                  block
                  loading={resending}
                  onClick={() => void resend()}
                >
                  {resending ? t("auth.sending") : t("auth.resendVerification")}
                </Button>
              </div>

              <Link href="/login" className={buttonClasses({ variant: "ghost", block: true })}>
                {t("auth.backToLogin")}
              </Link>
            </div>
          )}
        </div>
      </Card>
    </Container>
  );
}
