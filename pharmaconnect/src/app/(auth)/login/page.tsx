"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useSession, appToast as toast } from "@/components/Providers";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, Mail } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { useLocale } from "@/components/LocaleProvider";
import { AuthShell, PasswordField } from "../AuthShell";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { t } = useLocale();
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // Honour `?next=` so a deep link returns you to where you were going.
  const next = searchParams.get("next");

  useEffect(() => {
    if (session) {
      router.replace(session.user.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/patient");
    }
  }, [session, router]);

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      toast.success(t("auth.registeredToast"));
    }
    if (searchParams.get("reset") === "done") {
      toast.success(t("auth.resetDoneToast"));
    }
    // `t` is read through a local const on purpose: it changes identity on every
    // locale switch and would re-fire these one-off toasts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function resendVerification(email: string) {
    if (!email) {
      toast.error(t("auth.emailRequiredFirst"));
      return;
    }
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

  const onSubmit = async (values: LoginInput) => {
    setNeedsVerification(false);
    const result = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
    });

    if (result?.error) {
      if (/verify/i.test(result.error)) {
        setNeedsVerification(true);
        toast.error(t("auth.verifyFirst"));
      } else {
        toast.error(t("auth.invalidCredentials"));
      }
      return;
    }

    toast.success(t("auth.welcomeBack"));
    router.push(next && next.startsWith("/") ? next : "/");
    router.refresh();
  };

  return (
    <AuthShell
      icon={LogIn}
      title={t("auth.welcomeBack")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link
            href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
            className="rounded font-semibold text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            {t("auth.createOne")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          leading={<Mail />}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-1.5">
          <label htmlFor="login-password" className="block text-sm font-medium text-fg">
            {t("auth.password")}
          </label>
          <PasswordField
            id="login-password"
            autoComplete="current-password"
            placeholder="••••••••"
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            showLabel={t("auth.showPassword")}
            hideLabel={t("auth.hidePassword")}
            aria-invalid={errors.password ? true : undefined}
            className="h-10 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-fg shadow-xs transition-[box-shadow,border-color] duration-200 placeholder:text-fg-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
            {...register("password")}
          />
          {errors.password?.message && (
            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="rounded text-xs font-medium text-fg-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>

        <Button type="submit" block loading={isSubmitting}>
          {t("auth.signIn")}
        </Button>
      </form>

      {needsVerification && (
        <Alert
          tone="warning"
          className="mt-5"
          title={t("auth.emailNotVerified")}
          live="assertive"
          actions={
            <Button
              size="sm"
              loading={resending}
              onClick={() => void resendVerification(getValues("email"))}
            >
              {resending ? t("auth.sending") : t("auth.resendVerification")}
            </Button>
          }
        >
          {t("auth.emailNotVerifiedHint")}
        </Alert>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-canvas" />}>
      <LoginInner />
    </Suspense>
  );
}
