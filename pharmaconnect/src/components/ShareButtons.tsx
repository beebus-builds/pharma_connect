"use client";

import { useState } from "react";
import { Facebook, Link2, Check, MessageCircle } from "lucide-react";
import { facebookShareUrl, whatsappShareUrl } from "@/lib/seo";
import { buttonClasses } from "@/components/ui/Button";
import { useLocale } from "@/components/LocaleProvider";

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
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API needs a secure context; fall back for plain-HTTP LAN use.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const btn = buttonClasses({
    size: "sm",
    variant: "secondary",
    className: "font-semibold",
  });

  return (
    <div className="inline-flex flex-wrap items-center gap-2" aria-label={t("share.label", { title })}>
      <a
        href={facebookShareUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        aria-label={t("share.facebookAria", { title })}
      >
        <Facebook className="h-3.5 w-3.5 text-[#1877F2]" aria-hidden="true" />
        {!compact && t("share.facebook")}
      </a>
      <a
        href={whatsappShareUrl(url, title)}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        aria-label={t("share.whatsappAria", { title })}
      >
        <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" aria-hidden="true" />
        {!compact && t("share.whatsapp")}
      </a>
      <button
        type="button"
        onClick={() => void copyLink()}
        className={btn}
        aria-label={t("share.copyAria")}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        ) : (
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {!compact && (copied ? t("common.copied") : t("share.copyLink"))}
      </button>
    </div>
  );
}
