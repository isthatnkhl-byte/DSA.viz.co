import React from "react";
import type { ShiftInfo } from "@/lib/problems";
import { ArrowRightLeft } from "lucide-react";

interface CrossDatasetShiftBannerProps {
  shiftInfo: ShiftInfo;
}

export function CrossDatasetShiftBanner({ shiftInfo }: CrossDatasetShiftBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-4 py-2.5 shadow-sm backdrop-blur-sm animate-motion-glide">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/40 shadow-xs">
          <ArrowRightLeft className="size-4 text-primary" />
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground">
            <span className="text-primary uppercase tracking-wider text-[10px]">
              {shiftInfo.action ?? "SHIFT"}
            </span>
            <span>•</span>
            <span>
              [{shiftInfo.from ?? "Primary"}] ➔ [{shiftInfo.to ?? "Auxiliary"}]
            </span>
          </div>
          {shiftInfo.reason && (
            <span className="text-[11px] text-muted-foreground">
              {shiftInfo.reason}
            </span>
          )}
        </div>
      </div>
      <span className="rounded-md bg-primary/20 px-2 py-0.5 font-mono text-[9px] font-bold text-primary border border-primary/40 shadow-xs">
        CROSS-DATASET SYNC
      </span>
    </div>
  );
}
