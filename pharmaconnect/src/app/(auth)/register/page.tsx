"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { appToast as toast } from "@/components/Providers";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, UserRound, Building2, Check, Eye, EyeOff } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import GoogleMapPicker from "@/components/GoogleMapPicker";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [role, setRole] = useState<"PATIENT" | "PHARMACY">("PATIENT");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "PATIENT" },
  });

  const currentRole = watch("role");
  const watchedLat = watch("latitude");
  const watchedLng = watch("longitude");
  const pickedLocation =
    typeof watchedLat === "number" &&
    typeof watchedLng === "number" &&
    !Number.isNaN(watchedLat) &&
    !Number.isNaN(watchedLng)
      ? { lat: watchedLat, lng: watchedLng }
      : null;

  function selectRole(r: "PATIENT" | "PHARMACY") {
    setRole(r);
    setValue("role", r);
  }

  const passwordValue = watch("password") || "";
  const passwordStrength = passwordValue.length === 0 ? 0 : passwordValue.length < 6 ? 1 : passwordValue.length < 10 ? 2 : 3;

  const onSubmit = async (values: RegisterInput) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }
      toast.success(data.message || "Account created! Check your email to verify.");
      router.push("/login?registered=1");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center relative overflow-hidden py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-400/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-sky-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative w-full max-w-lg mx-auto px-4 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-b from-primary-500 to-primary-600 text-white rounded-2xl shadow-[0_12px_32px_-8px_rgb(39_150_129/0.55)] ring-1 ring-inset ring-white/25 mb-4">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{t("auth.registerTitle")}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t("auth.registerSubtitle")}</p>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur rounded-2xl shadow-card ring-1 ring-slate-200/80 dark:ring-slate-800 p-8">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 text-center">{t("auth.iAm")}</p>
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => selectRole("PATIENT")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold ring-1 ring-inset transition-all duration-200",
                currentRole === "PATIENT"
                  ? "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white shadow-md"
                  : "ring-slate-200 dark:ring-slate-700 text-slate-600 dark:text-slate-400 hover:ring-primary-300 dark:hover:ring-primary-700 bg-white dark:bg-slate-900"
              )}
            >
              <UserRound className="h-5 w-5" />
              {t("auth.rolePatient")}
            </button>
            <button
              type="button"
              onClick={() => selectRole("PHARMACY")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold ring-1 ring-inset transition-all duration-200",
                currentRole === "PHARMACY"
                  ? "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white shadow-md"
                  : "ring-slate-200 dark:ring-slate-700 text-slate-600 dark:text-slate-400 hover:ring-primary-300 dark:hover:ring-primary-700 bg-white dark:bg-slate-900"
              )}
            >
              <Building2 className="h-5 w-5" />
              {t("auth.rolePharmacy")}
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("role")} value={currentRole} />

            <Input label={t("auth.fullName")} placeholder="Ram Sharma" autoComplete="name" {...register("name")} error={errors.name?.message} />
            <Input label={t("auth.email")} type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} error={errors.email?.message} />
            <div className="space-y-1.5">
              <div className="relative">
                <Input
                  label={t("auth.password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
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
              {passwordValue && (
                <div className="flex gap-1" aria-hidden="true">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${i <= passwordStrength ? (passwordStrength === 1 ? "bg-red-500" : passwordStrength === 2 ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-200 dark:bg-slate-700"}`}
                    />
                  ))}
                </div>
              )}
              {passwordValue && (
                <p className="text-xs text-slate-500">
                  {passwordStrength === 1 ? "Weak — use 6+ characters" : passwordStrength === 2 ? "Medium — add numbers & symbols" : "Strong password"}
                </p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {currentRole === "PHARMACY" && (
                <motion.div
                  key="pharmacy-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{t("auth.rolePharmacy")}</p>
                    <div className="space-y-4">
                      <Input label={t("auth.pharmacyName")} placeholder="Nepal Life Pharmacy" {...register("pharmacyName")} error={errors.pharmacyName?.message} />
                      <Input label={t("auth.address")} placeholder="New Road, Kathmandu" {...register("address")} error={errors.address?.message} />
                      <Input label={t("auth.phone")} placeholder="01-4223344" {...register("phone")} error={errors.phone?.message} />
                      <Input label={`${t("auth.licenseNumber")} (optional)`} placeholder="PH-KTM-001" {...register("licenseNumber")} error={errors.licenseNumber?.message} />
                      <div>
                        <GoogleMapPicker
                          value={pickedLocation}
                          onChange={(pos) => {
                            setValue("latitude", pos.lat, { shouldValidate: true });
                            setValue("longitude", pos.lng, { shouldValidate: true });
                          }}
                          error={errors.latitude?.message ?? errors.longitude?.message}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" loading={isSubmitting} className="w-full mt-2">
              <Check className="h-4 w-4" />
              {t("auth.createOne")}
            </Button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            {t("auth.noAccountYet")}{" "}
            <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              {t("auth.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
