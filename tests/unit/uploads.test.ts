import { describe, expect, it } from "vitest";
import {
  sniffImageType,
  uploadFileName,
  isAllowedUploadSize,
  isSafeUploadName,
  mimeForUploadName,
  photoUrlField,
  IMAGE_EXTENSIONS,
} from "@/lib/uploads";

describe("sniffImageType (magic bytes)", () => {
  it("detects JPEG", () => {
    const buf = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    expect(sniffImageType(buf)).toBe("jpeg");
  });

  it("detects PNG", () => {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const buf = Buffer.concat([sig, Buffer.from("IHDR")]);
    expect(sniffImageType(buf)).toBe("png");
  });

  it("detects GIF87a and GIF89a", () => {
    expect(sniffImageType(Buffer.from("GIF87a...."))).toBe("gif");
    expect(sniffImageType(Buffer.from("GIF89a...."))).toBe("gif");
  });

  it("detects WebP (RIFF....WEBP)", () => {
    const buf = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from("WEBP"),
    ]);
    expect(sniffImageType(buf)).toBe("webp");
  });

  it("detects AVIF (ftyp brand)", () => {
    const buf = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x20]), Buffer.from("ftypavif")]);
    expect(sniffImageType(buf)).toBe("avif");
  });

  it("rejects text/HTML pretending to be an image", () => {
    const buf = Buffer.from("<html><body>hi</body></html>");
    expect(sniffImageType(buf)).toBeNull();
  });

  it("rejects buffers too short to sniff", () => {
    expect(sniffImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(sniffImageType(Buffer.alloc(0))).toBeNull();
  });

  it("rejects truncated PNG / fake brand bytes", () => {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(sniffImageType(sig)).toBe("png"); // signature still matches
    expect(sniffImageType(Buffer.from("RIFF....XYZP"))).toBeNull();
  });
});

describe("isAllowedUploadSize", () => {
  it("accepts sizes within the cap", () => {
    expect(isAllowedUploadSize(1, 1024)).toBe(true);
    expect(isAllowedUploadSize(1024, 1024)).toBe(true);
  });

  it("rejects empty files and oversized files", () => {
    expect(isAllowedUploadSize(0, 1024)).toBe(false);
    expect(isAllowedUploadSize(1025, 1024)).toBe(false);
  });
});

describe("isSafeUploadName", () => {
  const uuid = "322e93eb-c737-4e29-8e41-876c1768d3ef";

  it("accepts server-generated names", () => {
    expect(isSafeUploadName(`${uuid}.png`)).toBe(true);
    expect(isSafeUploadName(`${uuid}.jpg`)).toBe(true);
    expect(isSafeUploadName(`${uuid}.webp`)).toBe(true);
    expect(isSafeUploadName(`${uuid}.gif`)).toBe(true);
    expect(isSafeUploadName(`${uuid}.avif`)).toBe(true);
  });

  it("rejects traversal, arbitrary names, and double extensions", () => {
    expect(isSafeUploadName("../../etc/passwd")).toBe(false);
    expect(isSafeUploadName(`${uuid}.png/../x`)).toBe(false);
    expect(isSafeUploadName("foo.png")).toBe(false);
    expect(isSafeUploadName(`${uuid}.svg`)).toBe(false);
    expect(isSafeUploadName(`${uuid}.png.exe`)).toBe(false);
    expect(isSafeUploadName("")).toBe(false);
  });
});

describe("mimeForUploadName", () => {
  it("maps known extensions to image content types", () => {
    expect(mimeForUploadName("a.jpg")).toBe("image/jpeg");
    expect(mimeForUploadName("a.png")).toBe("image/png");
    expect(mimeForUploadName("a.webp")).toBe("image/webp");
    expect(mimeForUploadName("a.gif")).toBe("image/gif");
    expect(mimeForUploadName("a.avif")).toBe("image/avif");
  });

  it("returns null for non-image names", () => {
    expect(mimeForUploadName("a.exe")).toBeNull();
    expect(mimeForUploadName("a")).toBeNull();
  });
});

describe("photoUrlField", () => {
  const ok = (v: unknown) => expect(photoUrlField.safeParse(v).success).toBe(true);
  const bad = (v: unknown) => expect(photoUrlField.safeParse(v).success).toBe(false);

  it("accepts absolute URLs, upload paths, and empty (clear)", () => {
    ok("https://example.com/me.jpg");
    ok("http://images.example.com/a.png");
    ok("/api/files/abc-123.png");
    ok("");
    ok(null);
    ok(undefined);
  });

  it("rejects relative junk, data URLs, and oversized values", () => {
    bad("foo.jpg");
    bad("uploads/foo.jpg");
    bad("/uploads/foo.jpg");
    bad("//evil.com/x.jpg");
    bad("data:image/png;base64,AAAA");
    bad("x".repeat(3000));
  });
});

describe("uploadFileName", () => {
  it("uses the extension of the sniffed type", () => {
    expect(uploadFileName("jpeg")).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(uploadFileName("png")).toMatch(/\.png$/);
    expect(uploadFileName("webp")).toMatch(/\.webp$/);
    expect(uploadFileName("gif")).toMatch(/\.gif$/);
    expect(uploadFileName("avif")).toMatch(/\.avif$/);
  });

  it("generates unique names", () => {
    const a = uploadFileName("png");
    const b = uploadFileName("png");
    expect(a).not.toBe(b);
  });

  it("covers every sniffed type with an extension", () => {
    expect(Object.keys(IMAGE_EXTENSIONS).sort()).toEqual(["avif", "gif", "jpeg", "png", "webp"]);
  });
});
