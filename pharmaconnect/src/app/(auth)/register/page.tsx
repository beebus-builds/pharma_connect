"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { LocateFixed } from "lucide-react";
import { registerSchema, type RegisterInput } from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"PATIENT" | "PHARMACY">("PATIENT");

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
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", pos.coords.latitude);
        setValue("longitude", pos.coords.longitude);
        toast.success("Location captured");
      },
      () => toast.error("Could not detect location. Enter coordinates manually.")
    );
  }

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
    <div className="max-w-lg mx-auto px-4 py-16">
      <Card className="p-8">
        <h1 className="text-2xl font-bold mb-1">Create an account</h1>
        <p className="text-sm text-slate-500 mb-6">Join PharmaConnect as a patient or pharmacy</p>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => selectRole("PATIENT")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium border",
              currentRole === "PATIENT"
                ? "bg-primary-600 text-white border-primary-600"
                : "border-slate-300 dark:border-slate-700"
            )}
          >
            I'm a Patient
          </button>
          <button
            type="button"
            onClick={() => selectRole("PHARMACY")}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-medium border",
              currentRole === "PHARMACY"
                ? "bg-primary-600 text-white border-primary-600"
                : "border-slate-300 dark:border-slate-700"
            )}
          >
            I'm a Pharmacy
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("role")} value={currentRole} />

          <Input label="Full name" placeholder="Ram Sharma" {...register("name")} error={errors.name?.message} />
          <Input label="Email" type="email" placeholder="you@example.com" {...register("email")} error={errors.email?.message} />
          <Input label="Password" type="password" placeholder="At least 6 characters" {...register("password")} error={errors.password?.message} />

          {currentRole === "PHARMACY" && (
            <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
              <Input label="Pharmacy name" placeholder="Nepal Life Pharmacy" {...register("pharmacyName")} error={errors.pharmacyName?.message} />
              <Input label="Address" placeholder="New Road, Kathmandu" {...register("address")} error={errors.address?.message} />
              <Input label="Phone" placeholder="01-4223344" {...register("phone")} error={errors.phone?.message} />
              <Input label="License number" placeholder="PH-KTM-001" {...register("licenseNumber")} error={errors.licenseNumber?.message} />

              <div className="grid grid-cols-2 gap-3">
                <Input label="Latitude" type="number" step="any" {...register("latitude")} error={errors.latitude?.message} />
                <Input label="Longitude" type="number" step="any" {...register("longitude")} error={errors.longitude?.message} />
              </div>
              <Button type="button" variant="secondary" onClick={detectLocation} className="text-xs">
                <LocateFixed className="h-4 w-4" />
                Use my current location
              </Button>
            </div>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full">
            Create account
          </Button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
