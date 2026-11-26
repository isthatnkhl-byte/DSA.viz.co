import React, { useMemo, useState } from "react";
import { CheckCircle2, Info, ShieldAlert, Sparkles } from "lucide-react";
import type { GeneratedVisualArtifact } from "@/lib/master-patterns/types";

interface VerifiedVisualCanvasProps {
  artifact: GeneratedVisualArtifact;
  compact?: boolean;
}

const UNSAFE_SVG_PATTERN =
  /<\s*(?:script|foreignObject|iframe|object|embed)\b|javascript\s*:|\bon[a-z]+\s*=/i;

function sanitizeClientSvgMarkup(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("<svg") || UNSAFE_SVG_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export const VerifiedVisualCanvas: React.FC<VerifiedVisualCanvasProps> = ({
  artifact,
  compact = false,
}) => {
  const [showNotes, setShowNotes] = useState(false);

  const safeSvg = useMemo(
    () => sanitizeClientSvgMarkup(artifact.svg),
    [artifact.svg],
  );

  const spec = artifact.excalidrawSpec;

  return (
    <div className="border border-primary/35 bg-card/80 p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="size-3.5 text-primary shrink-0" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-foreground truncate">
            {artifact.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
              artifact.verifiedByAuditor
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                : "border-amber-500/40 bg-amber-500/10 text-amber-500"
            }`}
          >
            {artifact.verifiedByAuditor ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <ShieldAlert className="size-3" />
            )}
            {artifact.verifiedByAuditor
              ? "Verified Geometry"
              : "Fallback Trace"}
          </span>
          {artifact.auditNotes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowNotes((v) => !v)}
              className="inline-flex items-center gap-1 border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Info className="size-3" />
              Audit ({artifact.auditNotes.length})
            </button>
          )}
        </div>
      </div>

      {safeSvg ? (
        <div
          className={`w-full overflow-x-auto border border-border bg-slate-950/90 p-2 flex justify-center ${
            compact ? "max-h-56" : "max-h-80"
          }`}
          // Sanitized server-side via cheerio + client defense-in-depth guard
          dangerouslySetInnerHTML={{ __html: safeSvg }}
        />
      ) : spec ? (
        <div className="border border-border bg-slate-950/90 p-3 space-y-3 overflow-x-auto">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
            <span className="uppercase tracking-[0.14em]">
              {spec.kind.replace(/_/g, " ")}
            </span>
            {spec.highlightRange && (
              <span>
                Window [{spec.highlightRange[0]}..{spec.highlightRange[1]}]
              </span>
            )}
          </div>
          <div className="flex items-end gap-1.5 min-w-max py-2">
            {spec.arrayValues.map((val, idx) => {
              const inRange =
                spec.highlightRange &&
                idx >= spec.highlightRange[0] &&
                idx <= spec.highlightRange[1];
              const pointerNames = Object.entries(spec.pointers ?? {})
                .filter(([, pIdx]) => pIdx === idx)
                .map(([name]) => name);

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-1 min-w-[38px]"
                >
                  <div className="h-4 flex items-center gap-0.5 font-mono text-[9px] font-bold text-amber-400">
                    {pointerNames.join("/")}
                  </div>
                  <div
                    className={`w-9 h-9 flex items-center justify-center border font-mono text-xs font-bold ${
                      inRange
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                        : pointerNames.length > 0
                          ? "border-amber-400 bg-amber-500/20 text-amber-200"
                          : "border-slate-700 bg-slate-900 text-slate-200"
                    }`}
                  >
                    {val}
                  </div>
                  <span className="font-mono text-[9px] text-slate-500">
                    [{idx}]
                  </span>
                </div>
              );
            })}
          </div>
          {spec.note && (
            <p className="font-mono text-[11px] text-slate-300">{spec.note}</p>
          )}
        </div>
      ) : (
        <div className="border border-border bg-background p-3 font-mono text-xs text-muted-foreground">
          Visual artifact unavailable.
        </div>
      )}

      {showNotes && artifact.auditNotes.length > 0 && (
        <ul className="border border-border bg-background/80 px-3 py-2 space-y-1 font-mono text-[10px] text-muted-foreground list-disc list-inside">
          {artifact.auditNotes.map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
