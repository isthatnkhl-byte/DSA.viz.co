import React, { useMemo, useState } from "react";
import type { Val, BitRegisterState } from "./VisualizerTypes";
import { safeArray, toText } from "./VisualizerTypes";
import {
  Binary,
  Zap,
  Cpu,
  Sparkles,
  Hash,
  ArrowRightLeft,
  ShieldAlert,
  HelpCircle,
  Layers,
  Activity,
  Maximize2,
  RefreshCw,
  Eye,
  Check,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Split,
} from "lucide-react";

interface BitVisualizerProps {
  cells: Val[];
  current?: Val | null | undefined;
  visited?: Val[] | null | undefined;
  left?: number | null | undefined;
  right?: number | null | undefined;
  wSum?: number | null | undefined;
  mSum?: number | null | undefined;
  operation?: string | null | undefined;
  bitRegisterState?: BitRegisterState | null | undefined;
  desc?: string;
  variables?: Record<string, any> | null;
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
  bitRegisterState: rawBitState,
  desc = "",
  variables,
}: BitVisualizerProps) {
  const [selectedBit, setSelectedBit] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<"32bit" | "64bit" | "bitwise-grid">("32bit");
  const [activeTab, setActiveTab] = useState<"registers" | "truth-table" | "operations">("registers");

  const cells = useMemo(() => safeArray(rawCells), [rawCells]);
  const visited = useMemo(() => safeArray(rawVisited ?? []), [rawVisited]);

  // 1. Resolve Primary & Secondary Operands
  const primaryNumber = useMemo<number>(() => {
    if (rawBitState?.primaryValue !== undefined && rawBitState.primaryValue !== null) {
      return Number(rawBitState.primaryValue);
    }
    if (typeof variables?.n === "number") return variables.n;
    if (typeof variables?.num === "number") return variables.num;
    if (typeof variables?.a === "number") return variables.a;
    if (typeof current === "number" && !isNaN(current)) return current;
    if (typeof wSum === "number" && !isNaN(wSum)) return wSum;
    const firstNum = cells.find((c) => typeof c === "number");
    if (typeof firstNum === "number") return firstNum;
    const parsed = parseInt(String(current ?? cells[0] ?? "0"), 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [rawBitState, variables, current, wSum, cells]);

  const secondaryNumber = useMemo<number | null>(() => {
    if (rawBitState?.secondaryValue !== undefined && rawBitState.secondaryValue !== null) {
      return Number(rawBitState.secondaryValue);
    }
    if (typeof variables?.b === "number") return variables.b;
    if (typeof variables?.mask === "number") return variables.mask;
    if (typeof right === "number" && !isNaN(right) && cells[right] !== undefined && typeof cells[right] === "number") {
      return Number(cells[right]);
    }
    if (cells.length > 1 && typeof cells[1] === "number") {
      return Number(cells[1]);
    }
    return null;
  }, [rawBitState, variables, right, cells]);

  const resultNumber = useMemo<number | null>(() => {
    if (rawBitState?.resultValue !== undefined && rawBitState.resultValue !== null) {
      return Number(rawBitState.resultValue);
    }
    if (typeof mSum === "number") return mSum;
    if (typeof variables?.ans === "number") return variables.ans;
    if (typeof variables?.result === "number") return variables.result;
    if (typeof variables?.res === "number") return variables.res;
    return null;
  }, [rawBitState, mSum, variables]);

  // 2. Identify Active Bitmask and Shift Operator
  const activeOpType = useMemo<string>(() => {
    if (rawBitState?.operationType) return rawBitState.operationType.toUpperCase();
    const d = (desc + " " + operation).toLowerCase();
    if (/xor|\^|single-number|missing-number/.test(d)) return "XOR";
    if (/and|\&|bitwise-and|power-of-two/.test(d)) return "AND";
    if (/or|\|/.test(d)) return "OR";
    if (/not|~|complement/.test(d)) return "NOT";
    if (/reverse|reverse-bits/.test(d)) return "REVERSE";
    if (/popcnt|number-of-1-bits|hamming|counting-bits|count/.test(d)) return "POPCNT";
    if (/left-shift|shl|<<|\bshift\b/.test(d)) return "SHL";
    if (/right-shift|shr|>>>|>>/.test(d)) return "SHR";
    return "AND";
  }, [rawBitState, desc, operation]);

  // 3. Active Bit Index Pointer (0 to 31 or 63)
  const activeBitIndex = useMemo<number | null>(() => {
    if (rawBitState?.activeBitIndex !== undefined && rawBitState.activeBitIndex !== null) {
      return rawBitState.activeBitIndex;
    }
    if (typeof variables?.i === "number" && variables.i >= 0 && variables.i <= 63) return variables.i;
    if (typeof variables?.bit === "number" && variables.bit >= 0 && variables.bit <= 63) return variables.bit;
    if (typeof left === "number" && left >= 0 && left <= 63) return left;
    if (typeof right === "number" && right >= 0 && right <= 63) return right;
    return null;
  }, [rawBitState, variables, left, right]);

  // 4. Generate 32-bit and 64-bit Register Vectors
  const bits32Primary = useMemo(() => {
    const unsigned = primaryNumber >>> 0;
    const binStr = unsigned.toString(2).padStart(32, "0");
    return binStr.split("").map((b, idx) => ({
      bitIndex: 31 - idx,
      val: parseInt(b, 10),
    }));
  }, [primaryNumber]);

  const bits32Secondary = useMemo(() => {
    if (secondaryNumber === null) return null;
    const unsigned = secondaryNumber >>> 0;
    const binStr = unsigned.toString(2).padStart(32, "0");
    return binStr.split("").map((b, idx) => ({
      bitIndex: 31 - idx,
      val: parseInt(b, 10),
    }));
  }, [secondaryNumber]);

  const computedResult = useMemo(() => {
    if (resultNumber !== null) return resultNumber;
    if (secondaryNumber === null) {
      if (activeOpType === "NOT") return ~primaryNumber >>> 0;
      if (activeOpType === "POPCNT") return bits32Primary.filter((b) => b.val === 1).length;
      return primaryNumber;
    }
    switch (activeOpType) {
      case "AND":
        return (primaryNumber & secondaryNumber) >>> 0;
      case "OR":
        return (primaryNumber | secondaryNumber) >>> 0;
      case "XOR":
        return (primaryNumber ^ secondaryNumber) >>> 0;
      case "SHL":
        return (primaryNumber << (secondaryNumber & 31)) >>> 0;
      case "SHR":
        return (primaryNumber >> (secondaryNumber & 31)) >>> 0;
      case "USHR":
        return (primaryNumber >>> (secondaryNumber & 31)) >>> 0;
      default:
        return (primaryNumber & secondaryNumber) >>> 0;
    }
  }, [resultNumber, secondaryNumber, activeOpType, primaryNumber, bits32Primary]);

  const bits32Result = useMemo(() => {
    const unsigned = Number(computedResult) >>> 0;
    const binStr = unsigned.toString(2).padStart(32, "0");
    return binStr.split("").map((b, idx) => ({
      bitIndex: 31 - idx,
      val: parseInt(b, 10),
    }));
  }, [computedResult]);

  // Statistics & Metrics
  const onesCountPrimary = useMemo(() => bits32Primary.filter((b) => b.val === 1).length, [bits32Primary]);
  const onesCountSecondary = useMemo(() => bits32Secondary?.filter((b) => b.val === 1).length ?? 0, [bits32Secondary]);
  const onesCountResult = useMemo(() => bits32Result.filter((b) => b.val === 1).length, [bits32Result]);

  const hexPrimary = useMemo(() => "0x" + (primaryNumber >>> 0).toString(16).toUpperCase().padStart(8, "0"), [primaryNumber]);
  const hexSecondary = useMemo(() => secondaryNumber !== null ? "0x" + (secondaryNumber >>> 0).toString(16).toUpperCase().padStart(8, "0") : null, [secondaryNumber]);
  const hexResult = useMemo(() => "0x" + (Number(computedResult) >>> 0).toString(16).toUpperCase().padStart(8, "0"), [computedResult]);

  // Kernel Bitwise Mask (1 << activeBitIndex)
  const activeMask = useMemo(() => {
    if (activeBitIndex === null) return null;
    return (1 << activeBitIndex) >>> 0;
  }, [activeBitIndex]);

  return (
    <div className="flex flex-col gap-4">
      {/* 1. TOP TELEMETRY & HARDWARE REGISTER HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card/70 p-3.5 shadow-xs backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-inner">
            <Binary className="size-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-2">
              <span>ALU Binary Register & Bitwise Engine</span>
              <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] text-cyan-300 border border-cyan-500/25 font-bold">
                Operation: {activeOpType}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Primary: <strong className="text-foreground">{primaryNumber}</strong> ({hexPrimary}) • Set Bits: <strong className="text-cyan-400">{onesCountPrimary}</strong>
            </div>
          </div>
        </div>

        {/* View Mode & Tab Selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("registers")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === "registers"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Registers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("truth-table")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === "truth-table"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              Truth Table
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("operations")}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                activeTab === "operations"
                  ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              ALU Masks
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN REGISTER & BITWISE WORKSPACE */}
      {activeTab === "registers" && (
        <div className="flex flex-col gap-4">
          {/* PRIMARY REGISTER R0 */}
          <RegisterRow
            title="Register R0 (Primary Operand)"
            decimalVal={primaryNumber}
            hexVal={hexPrimary}
            bits={bits32Primary}
            onesCount={onesCountPrimary}
            activeBitIndex={activeBitIndex}
            selectedBit={selectedBit}
            onSelectBit={setSelectedBit}
            colorTheme="cyan"
          />

          {/* BITWISE ARITHMETIC OPERATOR PILL */}
          {secondaryNumber !== null && (
            <div className="flex items-center justify-center -my-2 relative z-10">
              <div className="flex items-center gap-2 rounded-xl bg-card border border-border/80 px-4 py-1.5 shadow-md font-mono text-xs">
                <Cpu className="size-3.5 text-cyan-400" />
                <span className="font-bold text-foreground">OPERATOR:</span>
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-black text-cyan-300 border border-cyan-500/30">
                  {activeOpType}
                </span>
                {activeBitIndex !== null && (
                  <span className="text-[11px] text-muted-foreground ml-1">
                    [Evaluating Bit Position #{activeBitIndex}]
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SECONDARY REGISTER R1 (IF AVAILABLE) */}
          {secondaryNumber !== null && bits32Secondary && (
            <RegisterRow
              title="Register R1 (Secondary Operand / Bitmask)"
              decimalVal={secondaryNumber}
              hexVal={hexSecondary ?? ""}
              bits={bits32Secondary}
              onesCount={onesCountSecondary}
              activeBitIndex={activeBitIndex}
              selectedBit={selectedBit}
              onSelectBit={setSelectedBit}
              colorTheme="purple"
            />
          )}

          {/* RESULT REGISTER R_OUT */}
          <RegisterRow
            title={`Accumulator Output (${activeOpType} Result)`}
            decimalVal={Number(computedResult)}
            hexVal={hexResult}
            bits={bits32Result}
            onesCount={onesCountResult}
            activeBitIndex={activeBitIndex}
            selectedBit={selectedBit}
            onSelectBit={setSelectedBit}
            colorTheme="emerald"
            isResult
          />
        </div>
      )}

      {/* 3. TRUTH TABLE INTERACTIVE INSPECTOR */}
      {activeTab === "truth-table" && (
        <TruthTableView
          activeOpType={activeOpType}
          primaryBits={bits32Primary}
          secondaryBits={bits32Secondary}
          resultBits={bits32Result}
          activeBitIndex={activeBitIndex}
        />
      )}

      {/* 4. ALU MASKS & BIT TRICKS PANEL */}
      {activeTab === "operations" && (
        <AluMasksPanel
          primaryNumber={primaryNumber}
          activeBitIndex={activeBitIndex}
          onesCount={onesCountPrimary}
        />
      )}

      {/* 5. ACTIVE BIT DETAILED INSPECTION FLYOUT */}
      {selectedBit !== null && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-xs text-foreground animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-wrap items-center gap-3">
            <Sparkles className="size-4 text-cyan-400" />
            <span className="font-bold">Inspected Bit Position:</span>
            <span className="font-mono font-black text-cyan-300 text-sm">Bit #{selectedBit}</span>
            <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] text-cyan-300 border border-cyan-500/30 font-bold">
              Weight: 2^{selectedBit} = {Math.pow(2, selectedBit)}
            </span>
            <span className="rounded bg-background/80 px-2 py-0.5 font-mono text-[10px] text-foreground border border-border">
              Mask: 1 &lt;&lt; {selectedBit} = 0x{(1 << selectedBit >>> 0).toString(16).toUpperCase()}
            </span>
            <span className="text-muted-foreground font-mono">
              Bit State in R0: <strong>{bits32Primary.find((b) => b.bitIndex === selectedBit)?.val ?? 0}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedBit(null)}
            className="rounded-lg p-1 hover:bg-cyan-500/20 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {/* 6. INPUT OPERANDS ARRAY CHIPS */}
      {cells.length > 1 && (
        <div className="rounded-xl border border-border/70 bg-card/40 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-mono text-muted-foreground px-1">
            <span className="flex items-center gap-1.5 font-semibold text-foreground">
              <Zap className="size-3.5 text-cyan-400" /> Stream / Operand Sequence
            </span>
            <span>{cells.length} Numbers in Pipeline</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {cells.map((numVal, idx) => {
              const isCurrent = typeof current === "number" && current === numVal;
              const isVisited = visited.includes(numVal);
              const num = Number(numVal);

              return (
                <div
                  key={idx}
                  className={`flex flex-col items-center rounded-xl border px-3 py-1.5 font-mono text-xs transition-all duration-300 ${
                    isCurrent
                      ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold shadow-xs scale-105"
                      : isVisited
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-border/60 bg-background/60 text-foreground"
                  }`}
                >
                  <span className="font-bold">{toText(numVal)}</span>
                  <span className="text-[9px] text-muted-foreground">
                    0x{(num >>> 0).toString(16).toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. BOTTOM SUMMARY & CONSTANT TIME HARDWARE BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <Cpu className="size-3.5 text-cyan-400" />
          <span>Bitwise hardware ALU operations execute in single-cycle O(1) time complexity.</span>
        </div>
        {activeMask !== null && (
          <div className="flex items-center gap-1.5 font-bold text-foreground">
            <Sparkles className="size-3.5 text-amber-400" />
            <span>Active Bit Mask: 0x{activeMask.toString(16).toUpperCase()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENT: REGISTER ROW (32-BIT CELLS GROUPED IN 4 BYTES)
// ---------------------------------------------------------------------------
interface RegisterRowProps {
  title: string;
  decimalVal: number;
  hexVal: string;
  bits: Array<{ bitIndex: number; val: number }>;
  onesCount: number;
  activeBitIndex: number | null;
  selectedBit: number | null;
  onSelectBit: (idx: number) => void;
  colorTheme: "cyan" | "purple" | "emerald";
  isResult?: boolean;
}

function RegisterRow({
  title,
  decimalVal,
  hexVal,
  bits,
  onesCount,
  activeBitIndex,
  selectedBit,
  onSelectBit,
  colorTheme,
  isResult = false,
}: RegisterRowProps) {
  const themeBorder =
    colorTheme === "cyan"
      ? "border-cyan-500/30"
      : colorTheme === "purple"
      ? "border-purple-500/30"
      : "border-emerald-500/30";

  const themeBg =
    colorTheme === "cyan"
      ? "bg-cyan-500/5"
      : colorTheme === "purple"
      ? "bg-purple-500/5"
      : "bg-emerald-500/5";

  return (
    <div className={`rounded-2xl border ${themeBorder} ${themeBg} p-4 shadow-xs backdrop-blur-sm`}>
      {/* Header Info */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <span
            className={`size-2.5 rounded-full ${
              colorTheme === "cyan"
                ? "bg-cyan-400"
                : colorTheme === "purple"
                ? "bg-purple-400"
                : "bg-emerald-400"
            }`}
          />
          <span>{title}</span>
          <span className="text-muted-foreground font-normal">
            (Dec: <strong className="text-foreground">{decimalVal}</strong> • Hex:{" "}
            <strong className="text-foreground">{hexVal}</strong>)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            Popcount: <strong className="text-foreground">{onesCount}</strong> / 32 set
          </span>
        </div>
      </div>

      {/* 32-bit Vector arranged in 4 Bytes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[0, 1, 2, 3].map((byteIdx) => {
          const byteBits = bits.slice(byteIdx * 8, (byteIdx + 1) * 8);
          const byteNumber = 4 - byteIdx;

          return (
            <div
              key={byteIdx}
              className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-background/70 p-2.5"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground px-0.5">
                <span className="font-semibold uppercase tracking-wider">Byte {byteNumber}</span>
                <span>bits {31 - byteIdx * 8}..{24 - byteIdx * 8}</span>
              </div>

              <div className="grid grid-cols-8 gap-1">
                {byteBits.map(({ bitIndex, val }) => {
                  const isActive = activeBitIndex === bitIndex;
                  const isSelected = selectedBit === bitIndex;
                  const isOne = val === 1;

                  let bitStyle = "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40";
                  if (isSelected) {
                    bitStyle = "border-amber-400 ring-2 ring-amber-400/80 bg-amber-500/25 text-amber-200 font-black scale-110 z-20 shadow-md";
                  } else if (isActive) {
                    bitStyle =
                      "border-cyan-400 ring-2 ring-cyan-400/80 bg-cyan-500/30 text-cyan-200 font-black scale-110 shadow-md shadow-cyan-500/30 z-10 animate-sync-glow constant-glow-primary";
                  } else if (isOne) {
                    if (colorTheme === "cyan") {
                      bitStyle = "border-cyan-500/50 bg-cyan-500/20 text-cyan-300 font-black shadow-xs";
                    } else if (colorTheme === "purple") {
                      bitStyle = "border-purple-500/50 bg-purple-500/20 text-purple-300 font-black shadow-xs";
                    } else {
                      bitStyle = "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-black shadow-xs";
                    }
                  }

                  return (
                    <button
                      key={bitIndex}
                      type="button"
                      onClick={() => onSelectBit(bitIndex)}
                      className="flex flex-col items-center gap-1 cursor-pointer group"
                    >
                      <div
                        className={`flex size-7 items-center justify-center rounded-lg border font-mono text-xs transition-all duration-200 ${bitStyle}`}
                      >
                        <span>{val}</span>
                      </div>
                      <span className="font-mono text-[8px] text-muted-foreground group-hover:text-foreground">
                        {bitIndex}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENT: TRUTH TABLE INTERACTIVE INSPECTOR
// ---------------------------------------------------------------------------
interface TruthTableViewProps {
  activeOpType: string;
  primaryBits: Array<{ bitIndex: number; val: number }>;
  secondaryBits: Array<{ bitIndex: number; val: number }> | null;
  resultBits: Array<{ bitIndex: number; val: number }>;
  activeBitIndex: number | null;
}

function TruthTableView({
  activeOpType,
  primaryBits,
  secondaryBits,
  resultBits,
  activeBitIndex,
}: TruthTableViewProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/80 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs font-mono font-bold text-foreground">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-cyan-400" />
          <span>Bitwise {activeOpType} Truth Table & Bit-by-Bit Alignment</span>
        </div>
        <span className="text-muted-foreground">32-Bit Evaluation Vector</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-border/60 text-muted-foreground text-[11px] uppercase">
              <th className="p-2">Bit Index</th>
              <th className="p-2">Bit A (R0)</th>
              {secondaryBits && <th className="p-2">Bit B (R1)</th>}
              <th className="p-2">Output (R_OUT)</th>
              <th className="p-2">Operation Logic</th>
            </tr>
          </thead>
          <tbody>
            {primaryBits.slice(0, 16).map((b) => {
              const bitIdx = b.bitIndex;
              const valA = b.val;
              const valB = secondaryBits ? secondaryBits.find((sb) => sb.bitIndex === bitIdx)?.val ?? 0 : null;
              const valOut = resultBits.find((rb) => rb.bitIndex === bitIdx)?.val ?? 0;
              const isActive = activeBitIndex === bitIdx;

              let explanation = "";
              if (activeOpType === "AND") explanation = `${valA} & ${valB} = ${valOut}`;
              else if (activeOpType === "OR") explanation = `${valA} | ${valB} = ${valOut}`;
              else if (activeOpType === "XOR") explanation = `${valA} ^ ${valB} = ${valOut} (${valA !== valB ? "Different" : "Identical"})`;
              else if (activeOpType === "NOT") explanation = `~${valA} = ${valOut}`;

              return (
                <tr
                  key={bitIdx}
                  className={`border-b border-border/30 transition-colors ${
                    isActive ? "bg-cyan-500/15 text-foreground font-bold" : "text-muted-foreground"
                  }`}
                >
                  <td className="p-2 font-bold font-mono text-foreground">Bit #{bitIdx}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded font-black ${valA === 1 ? "bg-cyan-500/20 text-cyan-300" : "bg-muted text-muted-foreground"}`}>
                      {valA}
                    </span>
                  </td>
                  {secondaryBits && (
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded font-black ${valB === 1 ? "bg-purple-500/20 text-purple-300" : "bg-muted text-muted-foreground"}`}>
                        {valB}
                      </span>
                    </td>
                  )}
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded font-black ${valOut === 1 ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                      {valOut}
                    </span>
                  </td>
                  <td className="p-2 text-[11px] font-mono text-muted-foreground">{explanation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENT: ALU MASKS & BIT TRICKS PANEL
// ---------------------------------------------------------------------------
interface AluMasksPanelProps {
  primaryNumber: number;
  activeBitIndex: number | null;
  onesCount: number;
}

function AluMasksPanel({ primaryNumber, activeBitIndex, onesCount }: AluMasksPanelProps) {
  const n = primaryNumber;
  const isPowerOfTwo = n > 0 && (n & (n - 1)) === 0;
  const lowestSetBit = n & -n;
  const clearLowestBit = n & (n - 1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Essential Bitwise Tricks */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm">
        <div className="text-xs font-bold text-foreground font-mono flex items-center gap-2">
          <Zap className="size-4 text-amber-400" />
          <span>Core Bit Manipulation Identifiers</span>
        </div>

        <div className="flex flex-col gap-2 mt-2 font-mono text-xs">
          {/* Power of 2 Check */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/60">
            <div>
              <div className="font-bold text-foreground">Power of Two (n & (n-1) == 0)</div>
              <div className="text-[10px] text-muted-foreground">Checks if only 1 bit is set</div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${isPowerOfTwo ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-muted text-muted-foreground"}`}>
              {isPowerOfTwo ? "True (Power of 2)" : "False"}
            </span>
          </div>

          {/* Lowest Set Bit Isolation */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/60">
            <div>
              <div className="font-bold text-foreground">Isolate Lowest Bit (n & -n)</div>
              <div className="text-[10px] text-muted-foreground">Kernighan / Two's complement trick</div>
            </div>
            <span className="font-black text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
              {lowestSetBit} (0x{lowestSetBit.toString(16).toUpperCase()})
            </span>
          </div>

          {/* Clear Lowest Set Bit */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/60">
            <div>
              <div className="font-bold text-foreground">Clear Lowest Bit (n & (n-1))</div>
              <div className="text-[10px] text-muted-foreground">Brian Kernighan popcount step</div>
            </div>
            <span className="font-black text-foreground bg-background px-2 py-0.5 rounded border border-border">
              {clearLowestBit} (0x{clearLowestBit.toString(16).toUpperCase()})
            </span>
          </div>
        </div>
      </div>

      {/* Bit Shifting Formulas */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-background/80 p-4 shadow-sm">
        <div className="text-xs font-bold text-foreground font-mono flex items-center gap-2">
          <ArrowRightLeft className="size-4 text-cyan-400" />
          <span>Bit Shifting Multipliers</span>
        </div>

        <div className="flex flex-col gap-2 mt-2 font-mono text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/60">
            <div>
              <div className="font-bold text-foreground">n &lt;&lt; 1 (Multiply by 2)</div>
              <div className="text-[10px] text-muted-foreground">Left shift inserts 0 at LSB</div>
            </div>
            <span className="font-black text-cyan-300">{(n << 1) >>> 0}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/60">
            <div>
              <div className="font-bold text-foreground">n &gt;&gt; 1 (Divide by 2)</div>
              <div className="text-[10px] text-muted-foreground">Arithmetic right shift</div>
            </div>
            <span className="font-black text-cyan-300">{n >> 1}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card/60">
            <div>
              <div className="font-bold text-foreground">n &gt;&gt;&gt; 1 (Logical Shift)</div>
              <div className="text-[10px] text-muted-foreground">Zero-fill unsigned right shift</div>
            </div>
            <span className="font-black text-cyan-300">{n >>> 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
