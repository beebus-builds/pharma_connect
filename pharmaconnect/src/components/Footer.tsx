"use client";

import Link from "next/link";
import { Globe, MessageCircle, PhoneCall, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState } from "react";
import { appToast as toast } from "@/components/Providers";

export default function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Thanks for subscribing!");
    setEmail("");
  };

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-20 pb-10 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-black text-2xl text-primary-700 dark:text-primary-400 mb-6 hover:opacity-80 transition-opacity">
              <div className="p-1.5 bg-primary-600 text-white rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              PharmaConnect
            </Link>
            <p className="text-slate-500 max-w-sm leading-relaxed mb-8 text-lg">
              Empowering patients and pharmacies across Nepal with real-time availability data, reducing healthcare friction, and saving precious time.
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
            <h4 className="font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Quick Links</h4>
            <ul className="space-y-4 text-slate-500 font-medium">
              <li><Link href="/" className="hover:text-primary-600 transition-colors flex items-center gap-2">Search Medicines</Link></li>
              <li><Link href="/how-it-works" className="hover:text-primary-600 transition-colors flex items-center gap-2">How it Works</Link></li>
              <li><Link href="/login" className="hover:text-primary-600 transition-colors flex items-center gap-2">User Login</Link></li>
              <li><Link href="/register" className="hover:text-primary-600 transition-colors flex items-center gap-2">Join as Pharmacy</Link></li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Stay Updated</h4>
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  required
                />
              </div>
              <Button type="submit" className="w-full py-2 text-sm">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
        
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <p>© {new Date().getFullYear()} PharmaConnect Nepal. Engineered for a healthier nation.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
            <Link href="mailto:support@pharmaconnect.com.np" className="hover:text-slate-600 transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
