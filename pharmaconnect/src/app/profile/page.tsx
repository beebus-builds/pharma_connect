"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { User, MapPin, Phone, Mail, ShieldCheck, Building2, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { VerifiedBadge } from "@/components/ui/Badge";
import GoogleMapView from "@/components/GoogleMapView";
import { appToast as toast } from "@/components/Providers";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const user = profile || session.user;
  const isPharmacy = user.role === "PHARMACY";

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-slate-500 mt-1">Your account information</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="p-8 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-full flex items-center justify-center mb-4 shadow-lg shadow-primary-500/20">
            <span className="text-3xl font-bold">
              {user.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <h2 className="text-xl font-bold">{user.name}</h2>
          <p className="text-sm text-slate-500 mb-4">{user.email}</p>
          <StatusBadge
            status={isPharmacy ? "AVAILABLE" : "PENDING"}
            label={isPharmacy ? "Pharmacy Account" : "Patient Account"}
          />
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <div className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-lg">
                <ShieldCheck className="h-4 w-4" />
              </div>
              Account Details
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <DetailRow icon={<User className="h-4 w-4" />} label="Full Name" value={user.name} />
              <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
              <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Role" value={user.role} />
            </div>
          </Card>

          {isPharmacy && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-lg">
                  <Building2 className="h-4 w-4" />
                </div>
                Pharmacy Information
                {user.pharmacy?.verified && <VerifiedBadge />}
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <DetailRow icon={<Building2 className="h-4 w-4" />} label="Pharmacy Name" value={user.pharmacy?.name || "Not available"} />
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={user.pharmacy?.phone || "Not available"} />
                <DetailRow icon={<MapPin className="h-4 w-4" />} label="Address" value={user.pharmacy?.address || "Not available"} className="sm:col-span-2" />
              </div>
              {typeof user.pharmacy?.latitude === "number" && typeof user.pharmacy?.longitude === "number" && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pinned location</label>
                  <div className="mt-2">
                    <GoogleMapView
                      lat={user.pharmacy.latitude}
                      lng={user.pharmacy.longitude}
                      name={user.pharmacy.name}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2 mt-1 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}
