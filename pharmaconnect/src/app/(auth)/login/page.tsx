"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const { data: session } = useSession();

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

  const onSubmit = async (values: LoginInput) => {
    const result = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
    });

    if (result?.error) {
      toast.error("Invalid email or password");
      return;
    }

    toast.success("Welcome back!");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card className="p-8">
        <h1 className="text-2xl font-bold mb-1">Log in</h1>
        <p className="text-sm text-slate-500 mb-6">Access your PharmaConnect account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" placeholder="you@example.com" {...register("email")} error={errors.email?.message} />
          <Input label="Password" type="password" placeholder="••••••••" {...register("password")} error={errors.password?.message} />

          <Button type="submit" loading={isSubmitting} className="w-full">
            Log in
          </Button>
        </form>

        <p className="text-sm text-slate-500 mt-6 text-center">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>

        <div className="mt-6 text-xs text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="font-medium mb-1">Demo accounts (after seeding):</p>
          <p>Patient: patient@example.com / password123</p>
          <p>Pharmacy: pharmacy1@example.com / password123</p>
        </div>
      </Card>
    </div>
  );
}
