import { randomUUID } from "node:crypto";
import { z } from "zod";

/**
 * Self-hosted upload helpers (no Vercel Blob — files are stored on our own
 * disk under `public/uploads` and served by Next). The server route validates
 * the actual file bytes (magic numbers), never trusting the client's declared
 * content-type or filename, so the only files that land on disk are real images
 * with server-generated names.
 */

export type ImageType = "jpeg" | "png" | "webp" | "gif" | "avif";

export const IMAGE_EXTENSIONS: Record<ImageType, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  gif: "gif",
  avif: "avif",
};

export const IMAGE_MIME_TYPES: Record<ImageType, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/**
 * Detect the real image type from the file's magic bytes.
 * Returns null for anything that isn't a JPEG/PNG/WebP/GIF/AVIF image.
 */
export function sniffImageType(buf: Buffer): ImageType | null {
  if (buf.length < 8) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.subarray(0, 8).equals(png)) return "png";

  // GIF: "GIF87a" or "GIF89a"
  const gifHead = buf.subarray(0, 6).toString("ascii");
  if (gifHead === "GIF87a" || gifHead === "GIF89a") return "gif";

  // WebP: "RIFF" .... "WEBP"
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  // AVIF/HEIF: ISO BMFF container — "ftyp" brand at offset 4
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") return "avif";
  }

  return null;
}

/** Server-generated filename: a UUID + the extension of the sniffed type. */
export function uploadFileName(type: ImageType): string {
  return `${randomUUID()}.${IMAGE_EXTENSIONS[type]}`;
}

/**
 * Profile-photo field validator: an absolute http(s) URL or a same-origin
 * `/api/files/` path (self-hosted uploads). Empty string clears the photo.
 */
export const photoUrlField = z
  .string()
  .max(2048)
  .refine((v) => /^(https?:\/\/|\/api\/files\/)/.test(v), {
    message: "photo URL must be an absolute URL or an /api/files/ path",
  })
  .or(z.literal(""))
  .optional()
  .nullable();

export function isAllowedUploadSize(bytes: number, maxBytes: number): boolean {
  return bytes > 0 && bytes <= maxBytes;
}

/** Strict server-generated filename: UUID + a known image extension. */
const UPLOAD_NAME_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|avif)$/;

export function isSafeUploadName(name: string): boolean {
  return UPLOAD_NAME_RE.test(name);
}

/** Content type for a server-generated upload filename (null if not an image). */
export function mimeForUploadName(name: string): string | null {
  const ext = name.split(".").pop() ?? "";
  const entry = Object.entries(IMAGE_EXTENSIONS).find(([, e]) => e === ext);
  return entry ? IMAGE_MIME_TYPES[entry[0] as ImageType] : null;
}
