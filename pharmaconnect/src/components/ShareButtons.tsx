"use client";

import { useState } from "react";
import { Facebook, Link2, Check, MessageCircle } from "lucide-react";
import { facebookShareUrl, whatsappShareUrl } from "@/lib/seo";

interface ShareButtonsProps {
  url: string;
  title: string;
  compact?: boolean;
}

/**
 * Zero-SDK share intents (SPECS 2B): plain Facebook sharer link + copy.
 * No tracking SDK, works for guests.
 */
export default function ShareButtons({ url, title, compact = false }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fbHref = facebookShareUrl(url);
  const waHref = whatsappShareUrl(url, title);

  const btn =
    "inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30";

  return (
    <div className="inline-flex flex-wrap items-center gap-2" aria-label={`Share ${title}`}>
      <a href={fbHref} target="_blank" rel="noopener noreferrer" className={btn} aria-label={`Share ${title} on Facebook`}>
        <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
        {!compact && "Share"}
      </a>
      <a href={waHref} target="_blank" rel="noopener noreferrer" className={btn} aria-label={`Share ${title} on WhatsApp`}>
        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
        {!compact && "WhatsApp"}
      </a>
      <button type="button" onClick={copyLink} className={btn} aria-label="Copy link">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link2 className="h-3.5 w-3.5" />}
        {!compact && (copied ? "Copied!" : "Copy link")}
      </button>
    </div>
  );
}
