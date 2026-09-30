"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useSession } from "@/components/Providers";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { appToast as toast } from "@/components/Providers";
import Link from "next/link";
import { Stethoscope, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/LocaleProvider";

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
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (session) {
      router.replace(session.user.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/patient");
    }
  }, [session, router]);

  useEffect(() => {
    if (searchParams.get("registered") === "1") {
      toast.success("Account created! Check your inbox for the verification email.");
    }
    if (searchParams.get("reset") === "done") {
      toast.success("Password changed. Please log in.");
    }
  }, [searchParams]);

  async function resendVerification(email: string) {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not resend email");
      toast.success(data.message);
    } catch (e: any) {
      toast.error(e.message);
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
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-400/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative w-full max-w-md mx-auto px-4 py-12 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-b from-primary-500 to-primary-600 text-white rounded-2xl shadow-[0_12px_32px_-8px_rgb(39_150_129/0.55)] ring-1 ring-inset ring-white/25 mb-4">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("auth.welcomeBack")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t("auth.loginSubtitle")}</p>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-2xl shadow-card ring-1 ring-slate-200/80 dark:ring-slate-800 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t("auth.email")}
              type="email"
              placeholder="you@example.com"
              {...register("email")}
              error={errors.email?.message}
            />
            <div className="relative">
              <Input
                label={t("auth.password")}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
                error={errors.password?.message}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-[2.1rem] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex justify-end -mt-2">
              <Link href="/forgot-password" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                {t("auth.forgotPassword")}
              </Link>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full">
              {t("auth.signIn")}
            </Button>
          </form>

          {needsVerification && (
            <div className="mt-4 rounded-2xl ring-1 ring-inset ring-amber-600/20 bg-amber-50 dark:bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold">{t("auth.emailNotVerified")}</p>
              <p className="mt-1 opacity-90">{t("auth.emailNotVerifiedHint")}</p>
              <Button
                variant="outline"
                className="mt-2 w-full"
                disabled={resending}
                onClick={() => resendVerification((document.querySelector('input[type="email"]') as HTMLInputElement)?.value ?? "")}
              >
                {resending ? t("auth.sending") : t("auth.resendVerification")}
              </Button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-slate-500">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              {t("auth.createOne")}
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-500 transition-colors">
            {t("auth.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
