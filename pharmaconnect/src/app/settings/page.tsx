"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, Lock, Mail, Save, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (session?.user) {
      setName(session.user.name ?? "");
    }
  }, [status, router, session]);

  async function handleUpdate() {
    setLoading(true);
    try {
      const updates: any = { name };
      if (password) updates.password = password;

      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");

      toast.success("Settings updated successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-slate-500 mt-1">Update your personal information and security</p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-lg">
              <User className="h-4 w-4" />
            </div>
            Personal Information
          </h3>
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <Mail className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-500">{session.user.email}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-lg">
              <Lock className="h-4 w-4" />
            </div>
            Security
          </h3>
          <div className="space-y-4">
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
            {password && password !== confirmPassword && (
              <p className="text-xs text-red-500 font-medium">Passwords do not match</p>
            )}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            loading={loading}
            onClick={handleUpdate}
            disabled={!!(password && password !== confirmPassword)}
            className="px-8"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
