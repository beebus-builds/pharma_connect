"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { appToast as toast } from "@/components/Providers";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, UserRound, Building2, Check } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Feedback";
import { useLocale } from "@/components/LocaleProvider";
import GoogleMapPicker from "@/components/GoogleMapPicker";
import { AuthShell, PasswordField } from "../AuthShell";
import type { MessageKey } from "@/lib/i18n";

const ROLES = [
  { value: "PATIENT", icon: UserRound, labelKey: "auth.rolePatient" },
  { value: "PHARMACY", icon: Building2, labelKey: "auth.rolePharmacy" },
] as const;

/**
 * 0–4 strength score.
 *
 * Length alone used to be scored, then labelled with composition advice
 * ("add numbers & symbols") that the score was not actually checking. This
 * measures what it claims to.
 */
function scorePassword(value: string): { score: number; key: MessageKey } {
  if (!value) return { score: 0, key: "auth.weak" };
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  // One point for a character class keeps a bare "aaaaaaaa" at the bottom.
  if (/[a-z]/.test(value) || /[A-Z]/.test(value) || /\d/.test(value)) score++;

  const capped = Math.min(4, score);
  const keys: MessageKey[] = ["auth.weak", "auth.weak", "auth.fair", "auth.good", "auth.strong"];
  return { score: capped, key: keys[capped] ?? "auth.weak" };
}

const STRENGTH_TONE = ["danger", "danger", "warning", "accent", "success"] as const;

function RegisterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
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
  const passwordValue = watch("password") || "";
  const next = searchParams.get("next");

  const pickedLocation = useMemo(
    () =>
      typeof watchedLat === "number" && typeof watchedLng === "number" &&
      Number.isFinite(watchedLat) && Number.isFinite(watchedLng)
        ? { lat: watchedLat, lng: watchedLng }
        : null,
    [watchedLat, watchedLng]
  );

  const strength = scorePassword(passwordValue);

  const onSubmit = async (values: RegisterInput) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      toast.success(data.message || t("auth.registeredToast"));
      router.push(next ? `/login?registered=1&next=${encodeURIComponent(next)}` : "/login?registered=1");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  return (
    <AuthShell
      showAside
      icon={UserPlus}
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
      footer={
        <>
          {t("auth.noAccountYet")}{" "}
          <Link
            href="/login"
            className="rounded font-semibold text-accent transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          >
            {t("auth.signIn")}
          </Link>
        </>
      }
    >
      {/* Role picker — a real segmented control, not two ad-hoc buttons. */}
      <fieldset className="mb-6">
        <legend className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
          {t("auth.iAm")}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map(({ value, icon: Icon, labelKey }) => {
            const active = currentRole === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValue("role", value, { shouldValidate: true })}
                aria-pressed={active}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ring-1 ring-inset transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring ${
                  active
                    ? "bg-accent text-accent-fg ring-accent"
                    : "bg-surface text-fg-muted ring-line hover:bg-surface-sunken hover:text-fg"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <input type="hidden" {...register("role")} />

        <Input
          label={t("auth.fullName")}
          autoComplete="name"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label={t("auth.email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-2">
          <label htmlFor="register-password" className="block text-sm font-medium text-fg">
            {t("auth.password")}
          </label>
          <PasswordField
            id="register-password"
            autoComplete="new-password"
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
          {/* Announced, not aria-hidden: strength guidance is useful to everyone. */}
          <div aria-live="polite">
            <Progress
              value={(strength.score / 4) * 100}
              tone={passwordValue ? STRENGTH_TONE[strength.score] : "accent"}
              label={passwordValue ? t("auth.showStrength") : undefined}
              showValue={false}
            />
            <p className="mt-1.5 flex items-center justify-between gap-3 text-xs text-fg-muted">
              <span>{passwordValue ? t(strength.key) : ""}</span>
              <span>{passwordValue ? t("auth.strengthHint") : ""}</span>
            </p>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {currentRole === "PHARMACY" && (
            <motion.div
              key="pharmacy-fields"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-4 border-t border-line pt-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
                  {t("auth.pharmacyDetails")}
                </p>
                <Input
                  label={t("auth.pharmacyName")}
                  autoComplete="organization"
                  error={errors.pharmacyName?.message}
                  {...register("pharmacyName")}
                />
                <Input
                  label={t("auth.address")}
                  autoComplete="street-address"
                  error={errors.address?.message}
                  {...register("address")}
                />
                <Input
                  label={t("auth.phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01-4XXXXXX"
                  error={errors.phone?.message}
                  {...register("phone")}
                />
                <Input
                  label={`${t("auth.licenseNumber")} · ${t("auth.optional")}`}
                  hint={t("auth.licenseHint")}
                  error={errors.licenseNumber?.message}
                  {...register("licenseNumber")}
                />
                <GoogleMapPicker
                  value={pickedLocation}
                  onChange={(pos) => {
                    setValue("latitude", pos.lat, { shouldValidate: true });
                    setValue("longitude", pos.lng, { shouldValidate: true });
                  }}
                  error={errors.latitude?.message ?? errors.longitude?.message}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" block loading={isSubmitting} className="mt-1">
          <Check className="h-4 w-4" aria-hidden="true" />
          {currentRole === "PHARMACY" ? t("auth.registerPharmacy") : t("auth.registerPatient")}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-canvas" />}>
      <RegisterInner />
    </Suspense>
  );
}
