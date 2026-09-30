"use client";

import Link from "next/link";
import { Globe, MessageCircle, PhoneCall, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";
import { appToast as toast } from "@/components/Providers";
import { useLocale } from "@/components/LocaleProvider";

export default function Footer() {
  const { t, locale } = useLocale();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const value = String(formData.get("email") ?? "").trim();
    if (!value || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          website: String(formData.get("website") ?? ""),
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("footer.subscribeFailed"));
      toast.success(t("footer.subscribed"));
      setEmail("");
      form.reset();
    } catch (err: any) {
      toast.error(err.message || t("footer.subscribeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 pt-16 pb-10 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-14">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-5 hover:opacity-90 transition-opacity">
              <div className="p-2 bg-gradient-to-b from-primary-500 to-primary-600 text-white rounded-xl shadow-md ring-1 ring-inset ring-white/25">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <span className="font-display font-semibold text-xl text-slate-900 dark:text-white">PharmaConnect</span>
            </Link>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-7">
              {t("footer.tagline")}
            </p>
            <div className="flex gap-4">
              {[
                { name: "Globe", icon: Globe },
                { name: "MessageCircle", icon: MessageCircle },
                { name: "PhoneCall", icon: PhoneCall },
              ].map(({ name, icon: Icon }) => (
                <div key={name} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-primary-600 hover:text-white transition-all duration-300 shadow-sm group">
                  <Icon className="h-6 w-6 group-hover:scale-110 transition-transform" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">{t("footer.quickLinks")}</h4>
            <ul className="space-y-4 text-slate-500 font-medium">
              <li><Link href="/" className="hover:text-primary-600 transition-colors flex items-center gap-2">{t("footer.searchMedicines")}</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary-600 transition-colors flex items-center gap-2">{t("nav.howItWorks")}</Link></li>
              <li><Link href="/login" className="hover:text-primary-600 transition-colors flex items-center gap-2">{t("footer.userLogin")}</Link></li>
              <li><Link href="/register" className="hover:text-primary-600 transition-colors flex items-center gap-2">{t("footer.joinPharmacy")}</Link></li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">{t("footer.stayUpdated")}</h4>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("footer.emailPlaceholder")}
                  aria-label={t("footer.emailPlaceholder")}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  required
                />
              </div>
              {/* Honeypot: visually hidden, removed from the a11y tree and tab order. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute h-0 w-0 opacity-0 pointer-events-none"
                defaultValue=""
              />
              <Button type="submit" className="w-full py-2 text-sm" loading={submitting} disabled={submitting}>
                {t("footer.subscribe")}
              </Button>
            </form>
          </div>
        </div>
        
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <p>© {new Date().getFullYear()} PharmaConnect Nepal. Engineered for a healthier nation.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">{t("footer.privacy")}</Link>
            <Link href="/terms" className="hover:text-slate-600 transition-colors">{t("footer.terms")}</Link>
            <Link href="mailto:support@pharmaconnect.com.np" className="hover:text-slate-600 transition-colors">{t("footer.contact")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
