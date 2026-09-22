import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

/**
 * Pharmacy photo storage.
 * - Production (Vercel): set BLOB_READ_WRITE_TOKEN (Vercel Dashboard → Storage →
 *   Blob) and files go to Vercel Blob (public URLs, CDN-backed).
 * - Dev / VPS without a token: files are stored under public/uploads and served
 *   by Next.js directly.
 */

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PHOTO_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
export type PhotoKind = "PROFILE" | "COVER";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validatePhotoFile(file: File): string | null {
  if (!file || file.size === 0) return "No file selected.";
  if (!PHOTO_ALLOWED_MIME.has(file.type)) return "Only JPG, PNG or WebP images are allowed.";
  if (file.size > PHOTO_MAX_BYTES) return "Image must be 5 MB or smaller.";
  return null;
}

function safeFileName(kind: PhotoKind, mime: string): string {
  const ext = EXT_BY_MIME[mime] ?? "jpg";
  const rand = crypto.randomBytes(8).toString("hex");
  return `${kind.toLowerCase()}-${Date.now()}-${rand}.${ext}`;
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export async function savePharmacyPhoto(
  pharmacyId: string,
  kind: PhotoKind,
  file: File
): Promise<string> {
  const fileName = safeFileName(kind, file.type);
  const blobPath = `pharmacies/${pharmacyId}/${fileName}`;

  if (isBlobConfigured()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(blobPath, file, {
      access: "public",
      contentType: file.type,
    });
    return blob.url;
  }

  // Local dev fallback — served from public/uploads by Next.js.
  const dir = path.join(process.cwd(), "public", "uploads", "pharmacies", pharmacyId);
  await fs.mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, fileName), buffer);
  return `/uploads/pharmacies/${pharmacyId}/${fileName}`;
}

/** Best-effort delete of a previously stored photo. Never throws. */
export async function deleteStoredPhoto(url: string): Promise<void> {
  try {
    if (!url) return;
    if (url.includes(".blob.vercel-storage.com/") && isBlobConfigured()) {
      const { del } = await import("@vercel/blob");
      await del(url);
      return;
    }
    if (url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", path.posix.normalize(url.replace(/^\/+/, "")));
      // Contain deletes inside public/uploads to avoid path traversal.
      const uploadsRoot = path.join(process.cwd(), "public", "uploads");
      if (filePath.startsWith(uploadsRoot)) {
        await fs.unlink(filePath).catch(() => {});
      }
    }
  } catch (error) {
    console.warn("[photos] cleanup delete failed:", error);
  }
}
