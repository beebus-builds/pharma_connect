"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import toast from "react-hot-toast";

export default function VerifyPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  async function resend() {
    if (!email) {
      toast.error("Enter your email to resend the link");
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
      if (!res.ok) throw new Error(data.error || "Could not resend");
      toast.success(data.message);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setResending(false);
    }
  }

  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");

      if (!token) {
        setStatus("error");
        setMessage("No verification token provided.");
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setExpired(Boolean(data.expired));
          throw new Error(data.error || "Verification failed");
        }

        setStatus("success");
        setMessage("Your email has been verified successfully! Check your inbox for a welcome email with next steps.");
        toast.success("Email verified! Welcome email sent.");
      } catch (e: any) {
        setStatus("error");
        setMessage(e.message);
        toast.error(e.message);
      }
    }
    verify();
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <Card className="p-8">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-slate-500">Verifying your email...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h1 className="text-2xl font-bold">Email Verified!</h1>
            <p className="text-slate-500">{message}</p>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <XCircle className="h-16 w-16 text-red-500" />
            <h1 className="text-2xl font-bold">Verification Failed</h1>
            <p className="text-slate-500">{message}</p>
            {expired && (
              <div className="w-full space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-sm text-amber-800">This link expired (links last 24 hours). Enter your email for a fresh link:</p>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <Button onClick={resend} disabled={resending} className="w-full">
                  {resending ? "Sending…" : "Resend verification email"}
                </Button>
              </div>
            )}
            <Link href="/login">
              <Button variant="outline" className="w-full">Return to Login</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
