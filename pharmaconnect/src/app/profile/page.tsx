"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User, MapPin, Phone, Mail, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load profile");
        setProfile(data.user);
      } catch (e: any) {
        toast.error(e.message || "Something went wrong");
      } finally {
        setLoadingProfile(false);
      }
    }
    if (session) loadProfile();
  }, [session]);

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const user = profile || session.user;
  const isPharmacy = user.role === "PHARMACY";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-slate-500">Manage your account information and preferences.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="p-6 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4">
            <User className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-bold">{user.name}</h2>
          <p className="text-sm text-slate-500 mb-4">{user.email}</p>
          <StatusBadge status={isPharmacy ? "AVAILABLE" : "PENDING"} label={isPharmacy ? "Verified Pharmacy" : "Patient Account"} />
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary-600" />
              Account Details
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase">Full Name</label>
                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{user.name}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase">Email Address</label>
                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{user.email}</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 uppercase">Account Role</label>
                <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{user.role}</span>
                </div>
              </div>
            </div>
          </Card>

          {isPharmacy && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary-600" />
                Pharmacy Information
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 uppercase">Pharmacy Name</label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <span className="text-sm">{user.pharmacy?.name || "Not available"}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 uppercase">Phone</label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{user.pharmacy?.phone || "Not available"}</span>
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-slate-500 uppercase">Address</label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{user.pharmacy?.address || "Not available"}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
