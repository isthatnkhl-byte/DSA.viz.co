import React, { useState } from "react";
import type { VizStep } from "@/lib/problems";
import { Share2, Copy, Check, Download, FileJson, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: VizStep;
  stepIndex: number;
  totalSteps: number;
  vizType: string;
}

export function ExportSnapshotModal({
  isOpen,
  onClose,
  currentStep,
  stepIndex,
  totalSteps,
  vizType,
}: ExportSnapshotModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("step", String(stepIndex));
      navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyJson = () => {
    const payload = JSON.stringify(
      {
        step: stepIndex + 1,
        totalSteps,
        vizType,
        timestamp: new Date().toISOString(),
        snapshot: currentStep,
      },
      null,
      2,
    );
    navigator.clipboard.writeText(payload);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadJson = () => {
    const payload = JSON.stringify(
      {
        step: stepIndex + 1,
        totalSteps,
        vizType,
        timestamp: new Date().toISOString(),
        snapshot: currentStep,
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `viz-snapshot-step-${stepIndex + 1}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/30">
              <Share2 className="size-4" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold text-foreground">Export &amp; Share Snapshot</h3>
              <p className="text-[11px] text-muted-foreground">
                Frame {stepIndex + 1} of {totalSteps} ({vizType.toUpperCase()})
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-7 rounded-lg" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {/* Shareable Link Card */}
          <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground">Shareable Frame Link</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs gap-1 font-mono"
                onClick={handleCopyLink}
              >
                {copiedLink ? (
                  <>
                    <Check className="size-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>Copy URL</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Creates a link pointing directly to Step {stepIndex + 1} for sharing.
            </p>
          </div>

          {/* JSON Export Card */}
          <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/60 p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground">Frame State Payload (JSON)</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 font-mono"
                  onClick={handleCopyJson}
                  title="Copy JSON to clipboard"
                >
                  {copiedJson ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                  <span>Copy</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 font-mono"
                  onClick={handleDownloadJson}
                  title="Download .json file"
                >
                  <Download className="size-3" />
                  <span>Download</span>
                </Button>
              </div>
            </div>
            <pre className="max-h-32 overflow-auto rounded-lg border border-border/40 bg-background/90 p-2 font-mono text-[10px] text-muted-foreground">
              {JSON.stringify(
                {
                  step: stepIndex + 1,
                  totalSteps,
                  type: vizType,
                  desc: currentStep.desc,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <Sparkles className="size-3 text-primary" />
            <span>State synchronized across all views</span>
          </span>
          <Button size="sm" variant="default" className="h-7 px-3 text-xs" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
