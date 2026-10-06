"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession } from "@/components/Providers";
import { appToast as toast } from "@/components/Providers";
import { Camera, ImagePlus, Trash2, ExternalLink, Loader2, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { PharmacyImageDTO } from "@/types";

type Kind = "PROFILE" | "COVER";

const SLOTS: Array<{
  kind: Kind;
  title: string;
  hint: string;
  aspect: string;
  acceptNote: string;
}> = [
  {
    kind: "PROFILE",
    title: "Profile picture",
    hint: "Square logo or storefront shot. Shown on search cards and your page.",
    aspect: "aspect-square max-w-[11rem]",
    acceptNote: "1:1 recommended",
  },
  {
    kind: "COVER",
    title: "Cover photo",
    hint: "Wide banner of your shop. Shown at the top of your storefront.",
    aspect: "aspect-[21/9]",
    acceptNote: "21:9 recommended",
  },
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (file.size > MAX_BYTES) return "Image must be 5 MB or smaller.";
  if (!ACCEPTED_TYPES.includes(file.type)) return "Only JPG, PNG or WebP images are allowed.";
  return null;
}

export default function PhotoManager() {
  const { data: session } = useSession();
  const [images, setImages] = useState<PharmacyImageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [dragOver, setDragOver] = useState<Kind | null>(null);
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
    const err = validateFile(file);
    if (err) {
      toast.error(err);
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
    <Card className="p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="font-display font-semibold text-lg flex items-center gap-2">
            <span className="p-1.5 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 rounded-xl">
              <Camera className="h-4 w-4" />
            </span>
            Pharmacy photos
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Patients see these on search cards and your storefront. JPG / PNG / WebP, max 5 MB each.
          </p>
        </div>
        {pharmacyId && (
          <a
            href={`/pharmacies/${pharmacyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:underline underline-offset-4 shrink-0 mt-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View storefront
          </a>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-[11rem_1fr] gap-5 mt-5" aria-hidden="true">
          <div className="skeleton aspect-square max-w-[11rem] w-full !rounded-2xl" />
          <div className="skeleton aspect-[21/9] w-full !rounded-2xl" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-[11rem_1fr] gap-6 mt-5">
          {SLOTS.map((slot) => {
            const url = urlFor(slot.kind);
            const isBusy = busy === slot.kind;
            const isDragOver = dragOver === slot.kind;
            return (
              <div key={slot.kind} className="space-y-2 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{slot.title}</p>
                  <span className="text-[11px] font-medium text-stone-400">{slot.acceptNote}</span>
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => fileRefs.current[slot.kind]?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(slot.kind);
                  }}
                  onDragLeave={() => setDragOver((cur) => (cur === slot.kind ? null : cur))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const f = e.dataTransfer.files?.[0];
                    if (f) upload(slot.kind, f);
                  }}
                  className={cn(
                    "group relative block w-full overflow-hidden rounded-2xl bg-stone-100 dark:bg-slate-800 border border-dashed transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/20",
                    slot.aspect,
                    isDragOver
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-stone-300 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500",
                    !url && "min-h-[7rem]"
                  )}
                  aria-label={url ? `Replace ${slot.title}` : `Upload ${slot.title}`}
                >
                  {url ? (
                    <Image
                      src={url}
                      alt={slot.title}
                      fill
                      className="object-cover"
                      sizes={slot.kind === "PROFILE" ? "176px" : "560px"}
                    />
                  ) : (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-stone-400">
                      <ImagePlus className="h-6 w-6" aria-hidden="true" />
                      <span className="text-[11px] font-semibold inline-flex items-center gap-1">
                        <Upload className="h-3 w-3" /> Drop or click to upload
                      </span>
                    </span>
                  )}
                  {/* Hover affordance when image exists */}
                  {url && !isBusy && (
                    <span className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-xs font-semibold text-white bg-slate-950/60 px-3 py-1.5 rounded-full">
                        Replace
                      </span>
                    </span>
                  )}
                  {isBusy && (
                    <span className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    </span>
                  )}
                </button>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{slot.hint}</p>
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
                    size="sm"
                    className="flex-1"
                    disabled={isBusy}
                    onClick={() => fileRefs.current[slot.kind]?.click()}
                  >
                    {url ? "Replace" : "Upload"}
                  </Button>
                  {url && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="!px-3"
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
