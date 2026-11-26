import crypto from "node:crypto";
import type {
  ImageSnapshot,
  SubmittedWorkImageInput,
  SupportedImageMime,
} from "./types";

export const MAX_WORK_IMAGES_PER_TURN = 2;
export const MAX_IMAGE_BYTE_LENGTH = 950 * 1024;
export const MAX_IMAGE_SIDE_PX = 4096;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const MAX_SESSION_IMAGE_SNAPSHOTS = 6;

export class ImageIntakeError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function stripDataUrlPrefix(raw: string): string {
  const trimmed = raw.trim();
  const match = /^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/s.exec(trimmed);
  return match ? match[1]! : trimmed;
}

/**
 * Pure-TS binary signature sniffing (ported from LearnHarness `submission-images.ts`
 * & `image-processing/mime.mjs`) so a client cannot spoof a declared MIME type.
 */
export function detectImageMimeFromBytes(
  bytes: Uint8Array,
): SupportedImageMime | null {
  if (bytes.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // GIF87a / GIF89a
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

function readU16BE(b: Uint8Array, i: number): number {
  return ((b[i]! << 8) | b[i + 1]!) >>> 0;
}

function readU16LE(b: Uint8Array, i: number): number {
  return (b[i]! | (b[i + 1]! << 8)) >>> 0;
}

function readU32BE(b: Uint8Array, i: number): number {
  return (
    ((b[i]! << 24) | (b[i + 1]! << 16) | (b[i + 2]! << 8) | b[i + 3]!) >>> 0
  );
}

/**
 * Parses intrinsic width/height directly from encoded headers without native binaries
 * to guard against malformed streams or decompression bombs (`> 16MP` / `> 4096px`).
 */
export function readImageDimensionsFromBytes(
  bytes: Uint8Array,
  mime: SupportedImageMime,
): { width: number; height: number } {
  if (mime === "image/png") {
    if (bytes.length < 24) throw new ImageIntakeError("Truncated PNG header.");
    return {
      width: readU32BE(bytes, 16),
      height: readU32BE(bytes, 20),
    };
  }

  if (mime === "image/gif") {
    if (bytes.length < 10) throw new ImageIntakeError("Truncated GIF header.");
    return {
      width: readU16LE(bytes, 6),
      height: readU16LE(bytes, 8),
    };
  }

  if (mime === "image/webp") {
    if (bytes.length < 30) throw new ImageIntakeError("Truncated WebP header.");
    const chunk = String.fromCharCode(
      bytes[12]!,
      bytes[13]!,
      bytes[14]!,
      bytes[15]!,
    );
    if (chunk === "VP8X") {
      const widthMinus1 =
        bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16);
      const heightMinus1 =
        bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16);
      return { width: widthMinus1 + 1, height: heightMinus1 + 1 };
    }
    if (chunk === "VP8L" && bytes.length >= 25) {
      const b0 = bytes[21]!;
      const b1 = bytes[22]!;
      const b2 = bytes[23]!;
      const b3 = bytes[24]!;
      const width = 1 + (((b1 & 0x3f) << 8) | b0);
      const height =
        1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { width, height };
    }
    if (chunk === "VP8 " && bytes.length >= 30) {
      return {
        width: readU16LE(bytes, 26) & 0x3fff,
        height: readU16LE(bytes, 28) & 0x3fff,
      };
    }
    throw new ImageIntakeError("Unsupported WebP chunk layout.");
  }

  // JPEG SOFn segment scanner
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;
    const marker = bytes[offset]!;
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > bytes.length) break;
    const segLen = readU16BE(bytes, offset);
    if (segLen < 2 || offset + segLen > bytes.length) break;

    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && segLen >= 7) {
      return {
        height: readU16BE(bytes, offset + 3),
        width: readU16BE(bytes, offset + 5),
      };
    }
    offset += segLen;
  }

  throw new ImageIntakeError("Could not locate JPEG SOF dimensions.");
}

export function validateAndIngestSubmittedImages(
  rawImages: SubmittedWorkImageInput[] | undefined,
  existingSnapshots: Record<string, ImageSnapshot> = {},
): {
  snapshots: ImageSnapshot[];
  updatedSnapshotMap: Record<string, ImageSnapshot>;
} {
  if (!rawImages || rawImages.length === 0) {
    return { snapshots: [], updatedSnapshotMap: existingSnapshots };
  }
  if (rawImages.length > MAX_WORK_IMAGES_PER_TURN) {
    throw new ImageIntakeError(
      `At most ${MAX_WORK_IMAGES_PER_TURN} work images may be attached per submission.`,
    );
  }

  const nextMap: Record<string, ImageSnapshot> = { ...existingSnapshots };
  const accepted: ImageSnapshot[] = [];

  for (const item of rawImages) {
    const cleanB64 = stripDataUrlPrefix(item.data);
    if (!cleanB64 || !/^[A-Za-z0-9+/=]+$/.test(cleanB64)) {
      throw new ImageIntakeError("Submitted image is not valid base64 data.");
    }
    const bytes = Buffer.from(cleanB64, "base64");
    if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTE_LENGTH) {
      throw new ImageIntakeError(
        "Submitted work image exceeds the 950 KiB normalized byte limit.",
      );
    }

    const detected = detectImageMimeFromBytes(bytes);
    if (!detected || detected !== item.mimeType) {
      throw new ImageIntakeError(
        `Submitted image bytes (${detected ?? "unknown"}) do not match declared ${item.mimeType}.`,
      );
    }

    const { width, height } = readImageDimensionsFromBytes(bytes, detected);
    if (
      width < 1 ||
      height < 1 ||
      width > MAX_IMAGE_SIDE_PX ||
      height > MAX_IMAGE_SIDE_PX ||
      width * height > MAX_IMAGE_PIXELS
    ) {
      throw new ImageIntakeError(
        `Image dimensions ${width}x${height} exceed safety bounds (${MAX_IMAGE_SIDE_PX}px / ${MAX_IMAGE_PIXELS} pixels).`,
      );
    }

    const snapshotId = crypto.createHash("sha256").update(bytes).digest("hex");
    const snap: ImageSnapshot = {
      snapshotId,
      mimeType: detected,
      width,
      height,
      byteLength: bytes.length,
      data: cleanB64,
      ...(item.caption?.trim() ? { caption: item.caption.trim().slice(0, 200) } : {}),
    };

    // Refresh insertion order for bounded LRU eviction
    delete nextMap[snapshotId];
    nextMap[snapshotId] = snap;
    accepted.push(snap);
  }

  const keys = Object.keys(nextMap);
  if (keys.length > MAX_SESSION_IMAGE_SNAPSHOTS) {
    for (const k of keys.slice(0, keys.length - MAX_SESSION_IMAGE_SNAPSHOTS)) {
      delete nextMap[k];
    }
  }

  return { snapshots: accepted, updatedSnapshotMap: nextMap };
}
