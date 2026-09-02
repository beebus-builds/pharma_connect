"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, LocateFixed, UserRound, Building2, Check, Eye, EyeOff } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"PATIENT" | "PHARMACY">("PATIENT");
  const [showPassword, setShowPassword] = useState(false);
  const [locating, setLocating] = useState(false);

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

  function selectRole(r: "PATIENT" | "PHARMACY") {
    setRole(r);
    setValue("role", r);
  }

  function detectLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude, { shouldValidate: true });
        setValue("longitude", pos.coords.longitude, { shouldValidate: true });
        toast.success("Location captured");
        setLocating(false);
      },
      () => {
        toast.error("Could not detect location. Enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      toast.success("Account created! Please log in.");
      router.push("/login");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-slate-950 dark:via-slate-900 dark:to-primary-950 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary-400/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative w-full max-w-lg mx-auto px-4 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-2xl shadow-lg shadow-primary-600/25 mb-4">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold">Create an account</h1>
          <p className="text-slate-500 mt-1">Join as a patient or pharmacy</p>
        </div>

        <div className="bg-white dark:bg-slate-800/90 backdrop-blur rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-8">
          <div className="flex gap-3 mb-8">
            <button
              type="button"
              onClick={() => selectRole("PATIENT")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200",
                currentRole === "PATIENT"
                  ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/20"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-300 dark:hover:border-primary-700"
              )}
            >
              <UserRound className="h-5 w-5" />
              Patient
            </button>
            <button
              type="button"
              onClick={() => selectRole("PHARMACY")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200",
                currentRole === "PHARMACY"
                  ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/20"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-300 dark:hover:border-primary-700"
              )}
            >
              <Building2 className="h-5 w-5" />
              Pharmacy
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("role")} value={currentRole} />

            <Input label="Full name" placeholder="Ram Sharma" autoComplete="name" {...register("name")} error={errors.name?.message} />
            <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} error={errors.email?.message} />
            <div className="space-y-1.5">
              <div className="relative">
                <Input
                  label="Password"
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Pharmacy details</p>
                    <div className="space-y-4">
                      <Input label="Pharmacy name" placeholder="Nepal Life Pharmacy" {...register("pharmacyName")} error={errors.pharmacyName?.message} />
                      <Input label="Address" placeholder="New Road, Kathmandu" {...register("address")} error={errors.address?.message} />
                      <Input label="Phone" placeholder="01-4223344" {...register("phone")} error={errors.phone?.message} />
                      <Input label="License number (optional)" placeholder="PH-KTM-001" {...register("licenseNumber")} error={errors.licenseNumber?.message} />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location coordinates</label>
                        <div className="grid grid-cols-2 gap-3">
                          <Input type="number" step="any" placeholder="Latitude" {...register("latitude")} error={errors.latitude?.message} />
                          <Input type="number" step="any" placeholder="Longitude" {...register("longitude")} error={errors.longitude?.message} />
                        </div>
                        <Button type="button" variant="secondary" onClick={detectLocation} loading={locating} className="mt-2 w-full text-xs">
                          <LocateFixed className="h-4 w-4" />
                          {locating ? "Detecting…" : "Use my current location"}
                        </Button>
                        <p className="text-[11px] text-slate-400 mt-1">We’ll fill latitude & longitude automatically. You can edit them.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" loading={isSubmitting} className="w-full mt-2">
              <Check className="h-4 w-4" />
              Create account
            </Button>
          </form>

          <p className="text-sm text-slate-500 mt-6 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
