"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "@/components/Providers";
import { appToast as toast } from "@/components/Providers";
import { Camera, ImagePlus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { PharmacyImageDTO } from "@/types";

type Kind = "PROFILE" | "COVER";

const SLOTS: Array<{ kind: Kind; title: string; hint: string; shape: string }> = [
  {
    kind: "PROFILE",
    title: "Profile picture",
    hint: "Square logo or storefront shot. Shown on search cards and your page.",
    shape: "h-28 w-28 rounded-2xl",
  },
  {
    kind: "COVER",
    title: "Cover photo",
    hint: "Wide banner of your shop. Shown at the top of your storefront.",
    shape: "h-28 w-full rounded-2xl",
  },
];

export default function PhotoManager() {
  const { data: session } = useSession();
  const [images, setImages] = useState<PharmacyImageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Kind | null>(null);
  const fileRefs = useRef<Record<Kind, HTMLInputElement | null>>({ PROFILE: null, COVER: null });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pharmacies/photo");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load photos");
      setImages(data.images ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const urlFor = (kind: Kind): string | null =>
    images.find((i) => i.kind === kind)?.url ?? null;

  async function upload(kind: Kind, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG or WebP images are allowed.");
      return;
    }
    setBusy(kind);
    try {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      const res = await fetch("/api/pharmacies/photo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      toast.success(kind === "PROFILE" ? "Profile picture updated" : "Cover photo updated");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(kind: Kind) {
    setBusy(kind);
    try {
      const res = await fetch(`/api/pharmacies/photo?kind=${kind}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Photo removed");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  }

  const pharmacyId = session?.user?.pharmacyId;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="font-bold flex items-center gap-2">
            <span className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-lg">
              <Camera className="h-4 w-4" />
            </span>
            Pharmacy photos
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Patients see these on search cards and your storefront. JPG/PNG/WebP, max 5 MB each.
          </p>
        </div>
        {pharmacyId && (
          <a
            href={`/pharmacies/${pharmacyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline shrink-0 mt-1"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View storefront
          </a>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading photos…
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5 mt-4">
          {SLOTS.map((slot) => {
            const url = urlFor(slot.kind);
            const isBusy = busy === slot.kind;
            return (
              <div key={slot.kind} className="space-y-2">
                <p className="text-sm font-semibold">{slot.title}</p>
                <div className={`relative ${slot.shape} overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center`}>
                  {url ? (
                    <Image
                      src={url}
                      alt={`${slot.title}`}
                      fill
                      className="object-cover"
                      sizes={slot.kind === "PROFILE" ? "112px" : "400px"}
                    />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-slate-300" aria-hidden="true" />
                  )}
                  {isBusy && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">{slot.hint}</p>
                <input
                  ref={(el) => {
                    fileRefs.current[slot.kind] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label={`Upload ${slot.title}`}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) upload(slot.kind, f);
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="text-xs flex-1"
                    disabled={isBusy}
                    onClick={() => fileRefs.current[slot.kind]?.click()}
                  >
                    {url ? "Replace" : "Upload"}
                  </Button>
                  {url && (
                    <Button
                      variant="danger"
                      className="text-xs px-3"
                      disabled={isBusy}
                      onClick={() => remove(slot.kind)}
                      aria-label={`Remove ${slot.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
