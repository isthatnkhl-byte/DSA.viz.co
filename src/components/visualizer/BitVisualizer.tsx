import React, { useMemo } from "react";
import type { Val } from "./VisualizerTypes";
import { safeArray, toText } from "./VisualizerTypes";
import { Binary, Zap, Cpu, Sparkles, Hash, ArrowRightLeft } from "lucide-react";

interface BitVisualizerProps {
  cells: Val[];
  current?: Val | null | undefined;
  visited?: Val[] | null | undefined;
  left?: number | null | undefined;
  right?: number | null | undefined;
  wSum?: number | null | undefined;
  mSum?: number | null | undefined;
  operation?: string | null | undefined;
}

export function BitVisualizer({
  cells: rawCells,
  current,
  visited: rawVisited,
  left,
  right,
  wSum,
  mSum,
  operation = "Bit Manipulation",
}: BitVisualizerProps) {
  const cells = useMemo(() => safeArray(rawCells), [rawCells]);
  const visited = useMemo(() => safeArray(rawVisited ?? []), [rawVisited]);

  // Extract the primary numeric value for bit breakdown
  const primaryNumber = useMemo<number>(() => {
    if (typeof current === "number" && !isNaN(current)) return current;
    if (typeof wSum === "number" && !isNaN(wSum)) return wSum;
    const firstNum = cells.find((c) => typeof c === "number");
    if (typeof firstNum === "number") return firstNum;
    const parsed = parseInt(String(current ?? cells[0] ?? "0"), 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [current, wSum, cells]);

  // 32-bit binary representation
  const bits32 = useMemo(() => {
    // Treat as 32-bit signed integer converted to unsigned for display
    const unsigned = (primaryNumber >>> 0);
    const binStr = unsigned.toString(2).padStart(32, "0");
    return binStr.split("").map((b, idx) => ({
      bitIndex: 31 - idx,
      val: parseInt(b, 10),
    }));
  }, [primaryNumber]);

  // Active bit index pointer (e.g. from left / right / current)
  const activeBitIndex = useMemo<number | null>(() => {
    if (typeof left === "number" && left >= 0 && left <= 31) return left;
    if (typeof right === "number" && right >= 0 && right <= 31) return right;
    return null;
  }, [left, right]);

  const hexString = useMemo(() => {
    return "0x" + (primaryNumber >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }, [primaryNumber]);

  const onesCount = useMemo(() => {
    return bits32.filter((b) => b.val === 1).length;
  }, [bits32]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header & Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Binary className="size-4.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <span>32-Bit Register Visualizer</span>
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] text-cyan-300 border border-cyan-500/30">
                IEEE-754 / Two's Complement
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Decimal: <strong className="text-foreground">{primaryNumber}</strong> • Set Bits (Hamming Weight): <strong className="text-cyan-400">{onesCount}</strong>
            </div>
          </div>
        </div>

        {/* Readouts (Decimal, Hex, Hamming Weight) */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-muted-foreground">
            <Hash className="size-3 text-primary" />
            <span>Dec: <strong className="text-foreground">{primaryNumber}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-muted-foreground">
            <Cpu className="size-3 text-accent" />
            <span>Hex: <strong className="text-foreground">{hexString}</strong></span>
          </div>
        </div>
      </div>

      {/* 32-Bit Register Grid (grouped in 4 bytes of 8 bits each) */}
      <div className="rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between text-[11px] font-mono text-muted-foreground px-1">
          <span>Most Significant Bit (MSB, bit 31)</span>
          <span>Least Significant Bit (LSB, bit 0)</span>
        </div>

        {/* Byte chunks: 4 bytes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((byteIdx) => {
            const byteBits = bits32.slice(byteIdx * 8, (byteIdx + 1) * 8);
            const byteNumber = 4 - byteIdx;

            return (
              <div
                key={byteIdx}
                className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-card/40 p-2.5"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-0.5">
                  <span className="font-semibold uppercase tracking-wider">Byte {byteNumber}</span>
                  <span>bits {31 - byteIdx * 8}..{24 - byteIdx * 8}</span>
                </div>

                <div className="grid grid-cols-8 gap-1">
                  {byteBits.map(({ bitIndex, val }) => {
                    const isActive = activeBitIndex === bitIndex;
                    const isOne = val === 1;

                    let bitStyle = "border-border/60 bg-muted/20 text-muted-foreground";
                    if (isActive) {
                      bitStyle =
                        "border-cyan-400 ring-2 ring-cyan-400/60 bg-cyan-500/30 text-cyan-200 font-black scale-110 shadow-md shadow-cyan-500/40 z-10 animate-sync-glow";
                    } else if (isOne) {
                      bitStyle =
                        "border-cyan-500/50 bg-cyan-500/15 text-cyan-300 font-bold shadow-xs shadow-cyan-500/20";
                    }

                    return (
                      <div key={bitIndex} className="flex flex-col items-center gap-1">
                        <div
                          className={`flex size-7.5 items-center justify-center rounded-lg border font-mono text-xs transition-all duration-300 ${bitStyle}`}
                        >
                          <span>{val}</span>
                        </div>
                        <span className="font-mono text-[8px] text-muted-foreground">
                          {bitIndex}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bit Manipulation Sequence Array if present */}
      {cells.length > 1 && (
        <div className="rounded-xl border border-border/70 bg-card/40 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-mono text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" /> Input Numbers / Operands
            </span>
            <span>{cells.length} elements</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {cells.map((numVal, idx) => {
              const isCurrent = typeof current === "number" && current === numVal;
              const isVisited = visited.includes(numVal);

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center rounded-xl border px-3 py-1.5 font-mono text-xs transition-all duration-300 ${
                    isCurrent
                      ? "border-primary bg-primary/20 text-primary font-bold shadow-xs scale-105"
                      : isVisited
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                        : "border-border/60 bg-background/60 text-foreground"
                  }`}
                >
                  <span className="font-bold">{toText(numVal)}</span>
                  <span className="text-[9px] text-muted-foreground">
                    0b{(Number(numVal) >>> 0).toString(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-cyan-400" />
          <span>Bitwise bitmasking executes in constant $O(1)$ hardware arithmetic cycles.</span>
        </div>
        {mSum !== null && mSum !== undefined && (
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Zap className="size-3.5 text-amber-400" />
            <span>Cumulative Mask / XOR Result: {String(mSum)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
