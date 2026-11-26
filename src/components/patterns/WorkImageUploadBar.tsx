import React, { useCallback, useRef, useState } from "react";
import { ImagePlus, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import type {
  SubmittedWorkImageInput,
  SupportedImageMime,
} from "@/lib/master-patterns/types";

interface WorkImageUploadBarProps {
  images: SubmittedWorkImageInput[];
  onChange: (next: SubmittedWorkImageInput[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

const MAX_DIMENSION = 1600;
const MAX_BASE64_CHARS = 1_150_000; // ~860 KiB binary, safely under 950 KiB server cap

const ACCEPTED_INPUT_TYPES = "image/png,image/jpeg,image/webp,image/gif";

function extractBase64Payload(dataUrl: string): {
  mimeType: SupportedImageMime;
  data: string;
} | null {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/i.exec(
    dataUrl.trim(),
  );
  if (!match) return null;
  const mime = match[1]!.toLowerCase() as SupportedImageMime;
  return { mimeType: mime, data: match[2]! };
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  mime: SupportedImageMime,
  quality: number,
): string {
  return canvas.toDataURL(mime, quality);
}

async function normalizeWorkImageFile(
  file: File,
): Promise<SubmittedWorkImageInput> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a PNG, JPEG, WebP, or GIF image.");
  }

  let bitmap: ImageBitmap | null = null;
  let fallbackImg: HTMLImageElement | null = null;
  let objectUrl: string | null = null;

  try {
    let width = 0;
    let height = 0;

    if (typeof createImageBitmap === "function") {
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: "from-image",
        });
      } catch {
        bitmap = await createImageBitmap(file);
      }
      width = bitmap.width;
      height = bitmap.height;
    } else {
      objectUrl = URL.createObjectURL(file);
      fallbackImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not decode uploaded image."));
        img.src = objectUrl!;
      });
      width = fallbackImg.naturalWidth || fallbackImg.width;
      height = fallbackImg.naturalHeight || fallbackImg.height;
    }

    if (width < 4 || height < 4) {
      throw new Error("Image dimensions are too small to inspect.");
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetW = Math.max(4, Math.round(width * scale));
    const targetH = Math.max(4, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas context unavailable for image preparation.");
    }

    if (bitmap) {
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    } else if (fallbackImg) {
      ctx.drawImage(fallbackImg, 0, 0, targetW, targetH);
    }

    const preferredMime: SupportedImageMime =
      file.type === "image/png" ? "image/png" : "image/jpeg";
    const candidates: Array<{ mime: SupportedImageMime; quality: number }> =
      preferredMime === "image/png"
        ? [
            { mime: "image/png", quality: 0.92 },
            { mime: "image/webp", quality: 0.85 },
            { mime: "image/jpeg", quality: 0.82 },
            { mime: "image/jpeg", quality: 0.64 },
          ]
        : [
            { mime: "image/jpeg", quality: 0.86 },
            { mime: "image/jpeg", quality: 0.72 },
            { mime: "image/jpeg", quality: 0.56 },
          ];

    for (const attempt of candidates) {
      const url = encodeCanvas(canvas, attempt.mime, attempt.quality);
      const parsed = extractBase64Payload(url);
      if (parsed && parsed.data.length <= MAX_BASE64_CHARS) {
        return {
          mimeType: parsed.mimeType,
          data: parsed.data,
          caption: file.name ? file.name.slice(0, 120) : undefined,
        };
      }
    }

    throw new Error(
      "Image remains too large after compression. Try cropping to just your trace or sketch.",
    );
  } finally {
    bitmap?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export const WorkImageUploadBar: React.FC<WorkImageUploadBarProps> = ({
  images,
  onChange,
  disabled = false,
  maxImages = 2,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (disabled || processing) return;
      const remaining = Math.max(0, maxImages - images.length);
      if (remaining === 0) {
        setErrorMsg(`At most ${maxImages} work images can be attached per turn.`);
        return;
      }

      const incoming = Array.from(fileList).slice(0, remaining);
      if (incoming.length === 0) return;

      setProcessing(true);
      setErrorMsg(null);
      try {
        const encoded: SubmittedWorkImageInput[] = [];
        for (const f of incoming) {
          encoded.push(await normalizeWorkImageFile(f));
        }
        onChange([...images, ...encoded].slice(0, maxImages));
      } catch (err) {
        setErrorMsg((err as Error)?.message || "Failed to process image.");
      } finally {
        setProcessing(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [disabled, processing, maxImages, images, onChange],
  );

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.files;
    if (items && items.length > 0) {
      e.preventDefault();
      void handleFiles(items);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer?.files?.length) {
          void handleFiles(e.dataTransfer.files);
        }
      }}
      className={`border px-3 py-2.5 space-y-2 transition-colors ${
        dragOver
          ? "border-primary bg-primary/10"
          : "border-border/80 bg-background/60"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <ImagePlus className="size-3.5 text-primary" />
          <span>
            Dry-Run / Whiteboard Photo ({images.length}/{maxImages})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_INPUT_TYPES}
            multiple={maxImages > 1}
            disabled={disabled || processing || images.length >= maxImages}
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
            }}
            className="hidden"
          />
          <button
            type="button"
            disabled={disabled || processing || images.length >= maxImages}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 border border-border bg-card px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] hover:border-primary disabled:opacity-40 cursor-pointer"
          >
            {processing ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Upload className="size-3" />
            )}
            {processing ? "Preparing..." : "Attach Trace / Paste"}
          </button>
        </div>
      </div>

      {images.length === 0 && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="size-3 shrink-0" />
          Optional: attach or paste a dry-run table, pointer trace, or whiteboard sketch for multimodal AI grading.
        </p>
      )}

      {errorMsg && (
        <p className="font-mono text-[10px] text-rose-500">{errorMsg}</p>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {images.map((img, idx) => (
            <div
              key={`${img.mimeType}_${idx}`}
              className="border border-border bg-card p-2 flex items-start gap-2.5"
            >
              <img
                src={`data:${img.mimeType};base64,${img.data}`}
                alt={img.caption || `Uploaded trace ${idx + 1}`}
                className="w-16 h-16 object-cover border border-border shrink-0 bg-muted"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[9px] uppercase text-primary font-bold">
                    {img.mimeType.replace("image/", "").toUpperCase()} ·{" "}
                    {Math.max(1, Math.round((img.data.length * 0.75) / 1024))} KB
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange(images.filter((_, i) => i !== idx))
                    }
                    title="Remove attached image"
                    className="text-muted-foreground hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  disabled={disabled}
                  value={img.caption ?? ""}
                  maxLength={120}
                  onChange={(e) =>
                    onChange(
                      images.map((item, i) =>
                        i === idx ? { ...item, caption: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Add optional caption (e.g. pointer trace i=2..5)"
                  className="w-full border border-border bg-background px-2 py-1 font-mono text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
