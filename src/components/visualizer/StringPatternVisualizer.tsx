import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Search,
  Hash,
  GitBranch,
  CornerDownRight,
  SlidersHorizontal,
  Binary,
  Code2,
  Info,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type {
  KmpAlgorithmState,
  RabinKarpAlgorithmState,
  AhoCorasickState,
  AhoCorasickNode,
  StringPatternState,
} from "./VisualizerTypes";

interface StringPatternVisualizerProps {
  kmpState?: KmpAlgorithmState | null;
  rabinKarpState?: RabinKarpAlgorithmState | null;
  ahoCorasickState?: AhoCorasickState | null;
  stringPatternState?: StringPatternState | null;
  // Fallbacks from simple step props
  lps?: number[] | null;
  patternStr?: string | null;
  textStr?: string | null;
  patternIndex?: number | null;
  textIndex?: number | null;
}

export function StringPatternVisualizer({
  kmpState: propKmp,
  rabinKarpState: propRabin,
  ahoCorasickState: propAho,
  stringPatternState,
  lps,
  patternStr,
  textStr,
  patternIndex,
  textIndex,
}: StringPatternVisualizerProps) {
  // Resolve effective state objects
  const kmp = useMemo(() => {
    if (propKmp) return propKmp;
    if (stringPatternState?.kmpState) return stringPatternState.kmpState;
    if (patternStr && lps) {
      return {
        pattern: patternStr,
        text: textStr ?? undefined,
        lpsTable: lps,
        textIndex: textIndex ?? null,
        patternIndex: patternIndex ?? null,
        alignmentOffset:
          textIndex !== undefined && patternIndex !== undefined
            ? Math.max(0, (textIndex ?? 0) - (patternIndex ?? 0))
            : 0,
      } as KmpAlgorithmState;
    }
    return null;
  }, [propKmp, stringPatternState, patternStr, textStr, lps, patternIndex, textIndex]);

  const rabin = useMemo(() => {
    if (propRabin) return propRabin;
    if (stringPatternState?.rabinKarpState) return stringPatternState.rabinKarpState;
    return null;
  }, [propRabin, stringPatternState]);

  const aho = useMemo(() => {
    if (propAho) return propAho;
    if (stringPatternState?.ahoCorasickState) return stringPatternState.ahoCorasickState;
    return null;
  }, [propAho, stringPatternState]);

  // Determine initial active tab based on what data exists
  const defaultTab = useMemo(() => {
    if (rabin) return "rabin_karp";
    if (aho) return "aho_corasick";
    return "kmp";
  }, [rabin, aho]);

  const [activeTab, setActiveTab] = useState<"kmp" | "rabin_karp" | "aho_corasick">(defaultTab);

  // Auto-sync tab if incoming props change decisively
  React.useEffect(() => {
    if (rabin && activeTab !== "rabin_karp" && !kmp && !aho) {
      setActiveTab("rabin_karp");
    } else if (aho && activeTab !== "aho_corasick" && !kmp && !rabin) {
      setActiveTab("aho_corasick");
    }
  }, [rabin, aho, kmp, activeTab]);

  return (
    <div
      id="string-pattern-visualizer"
      className="flex flex-col gap-4 w-full rounded-2xl border border-border/80 bg-card/70 p-4 sm:p-5 shadow-sm backdrop-blur-sm"
    >
      {/* Header & Sub-Algorithm Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
            <Search className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm tracking-tight text-foreground flex items-center gap-2">
              String Pattern Matching & Automata Engine
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {activeTab === "kmp"
                  ? "KMP / LPS"
                  : activeTab === "rabin_karp"
                  ? "Rabin-Karp"
                  : "Aho-Corasick"}
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Deterministic string search, prefix-suffix failure functions & polynomial rolling hashes
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/60 p-1">
          <button
            type="button"
            id="tab-kmp"
            onClick={() => setActiveTab("kmp")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-semibold transition-all ${
              activeTab === "kmp"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <GitBranch className="size-3.5" />
            <span>KMP &amp; LPS (π)</span>
          </button>
          <button
            type="button"
            id="tab-rabin"
            onClick={() => setActiveTab("rabin_karp")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-semibold transition-all ${
              activeTab === "rabin_karp"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Hash className="size-3.5" />
            <span>Rabin-Karp Rolling Hash</span>
          </button>
          <button
            type="button"
            id="tab-aho"
            onClick={() => setActiveTab("aho_corasick")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-semibold transition-all ${
              activeTab === "aho_corasick"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Sparkles className="size-3.5" />
            <span>Aho-Corasick Trie Automaton</span>
          </button>
        </div>
      </div>

      {/* Main Tab Renderers */}
      {activeTab === "kmp" && (
        <KmpTabRenderer
          kmp={kmp}
          fallbackText={textStr}
          fallbackPattern={patternStr}
          fallbackLps={lps}
          fallbackTextIdx={textIndex}
          fallbackPatIdx={patternIndex}
        />
      )}

      {activeTab === "rabin_karp" && (
        <RabinKarpTabRenderer
          rabin={rabin}
          fallbackText={textStr}
          fallbackPattern={patternStr}
        />
      )}

      {activeTab === "aho_corasick" && (
        <AhoCorasickTabRenderer
          aho={aho}
          fallbackText={textStr}
          fallbackPattern={patternStr}
        />
      )}
    </div>
  );
}

// ==========================================
// 1. KMP & LPS TABLE COMPONENT
// ==========================================
function KmpTabRenderer({
  kmp,
  fallbackText,
  fallbackPattern,
  fallbackLps,
  fallbackTextIdx,
  fallbackPatIdx,
}: {
  kmp: KmpAlgorithmState | null;
  fallbackText?: string | null;
  fallbackPattern?: string | null;
  fallbackLps?: number[] | null;
  fallbackTextIdx?: number | null;
  fallbackPatIdx?: number | null;
}) {
  const pattern = kmp?.pattern ?? fallbackPattern ?? "ABABCABAB";
  const text = kmp?.text ?? fallbackText ?? "ABABDABACDABABCABAB";
  const lps = kmp?.lpsTable ?? fallbackLps ?? computeDefaultLPS(pattern);
  const textIdx = kmp?.textIndex ?? fallbackTextIdx ?? 0;
  const patIdx = kmp?.patternIndex ?? fallbackPatIdx ?? 0;
  const alignmentOffset =
    kmp?.alignmentOffset ?? Math.max(0, (textIdx ?? 0) - (patIdx ?? 0));

  const isMatch =
    kmp?.isMatch ??
    (text && pattern && textIdx < text.length && patIdx < pattern.length
      ? text[textIdx] === pattern[patIdx]
      : false);

  const isMismatch =
    kmp?.isMismatch ??
    (text && pattern && textIdx < text.length && patIdx < pattern.length
      ? text[textIdx] !== pattern[patIdx]
      : false);

  // Suffix/Prefix match for the active LPS cell
  const activeLpsVal = patIdx > 0 && patIdx < lps.length ? lps[patIdx - 1] : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Dynamic Status / Formula Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-3.5">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-7 items-center justify-center rounded-lg font-mono text-xs font-bold ${
              isMatch
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : isMismatch
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "bg-sky-500/20 text-sky-400 border border-sky-500/40"
            }`}
          >
            {isMatch ? "✓" : isMismatch ? "✗" : "i, j"}
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold text-foreground">
              {kmp?.phase === "match_found"
                ? "🎉 Pattern Match Found!"
                : kmp?.mismatchFallback
                ? `Mismatch Fallback: j ← π[j-1] = ${kmp.mismatchFallback.toJ}`
                : isMatch
                ? `Character Match: T[${textIdx}] == P[${patIdx}] ('${text[textIdx]}')`
                : isMismatch
                ? `Character Mismatch: T[${textIdx}] ('${text[textIdx]}') ≠ P[${patIdx}] ('${pattern[patIdx]}')`
                : "KMP Linear Search State"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {kmp?.mismatchFallback?.reason ??
                (isMismatch && patIdx > 0
                  ? `Shift pattern forward without rewinding text cursor i=${textIdx}. Reset j to π[${patIdx - 1}] = ${lps[patIdx - 1]}.`
                  : isMatch
                  ? `Increment both pointers i (${textIdx} → ${textIdx + 1}) and j (${patIdx} → ${patIdx + 1}).`
                  : "Matching pattern over text stream.")}
            </span>
          </div>
        </div>

        {/* Readout Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 font-mono text-xs">
            <span className="text-muted-foreground font-semibold">Text (i):</span>
            <span className="font-black text-cyan-400">{textIdx}</span>
            <span className="text-[10px] text-muted-foreground">/ {text.length}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 font-mono text-xs">
            <span className="text-muted-foreground font-semibold">Pattern (j):</span>
            <span className="font-black text-amber-400">{patIdx}</span>
            <span className="text-[10px] text-muted-foreground">/ {pattern.length}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 font-mono text-xs">
            <span className="text-muted-foreground font-semibold">Offset (i - j):</span>
            <span className="font-black text-primary">{alignmentOffset}</span>
          </div>
        </div>
      </div>

      {/* 2-Track Alignment Visualizer: Text Track + Aligned Pattern Track */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/40 p-4 overflow-x-auto">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <SlidersHorizontal className="size-3.5 text-primary" />
            Dynamic Text &amp; Pattern Alignment Track
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            Cell Width: 38px
          </span>
        </div>

        {/* Text Track (T) */}
        <div className="flex items-center gap-2 pt-2">
          <div className="w-24 shrink-0 font-mono text-xs font-bold text-cyan-400 flex items-center gap-1">
            <span>Text T:</span>
            <span className="text-[10px] text-muted-foreground font-normal">[{text.length}]</span>
          </div>
          <div className="flex gap-1 relative">
            {text.split("").map((ch, idx) => {
              const isCurrentText = idx === textIdx;
              const isWithinWindow =
                idx >= alignmentOffset && idx < alignmentOffset + pattern.length;
              const isConfirmedPrefix =
                idx >= alignmentOffset && idx < alignmentOffset + patIdx;

              return (
                <div
                  key={`text-ch-${idx}`}
                  id={`text-cell-${idx}`}
                  className={`flex flex-col items-center justify-center size-9 rounded-lg border font-mono text-xs font-bold transition-all ${
                    isCurrentText
                      ? isMatch
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/40 scale-105"
                        : isMismatch
                        ? "border-rose-500 bg-rose-500/20 text-rose-300 ring-2 ring-rose-500/40 scale-105"
                        : "border-cyan-400 bg-cyan-500/20 text-cyan-300 ring-2 ring-cyan-400/40 scale-105"
                      : isConfirmedPrefix
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : isWithinWindow
                      ? "border-amber-500/30 bg-amber-500/5 text-foreground"
                      : "border-border/60 bg-card/60 text-foreground"
                  }`}
                >
                  <span className="text-sm font-black">{ch}</span>
                  <span className="text-[8px] text-muted-foreground font-normal">{idx}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pointer Alignment Indicator & Mismatch Shift Sightline */}
        <div className="flex items-center gap-2">
          <div className="w-24 shrink-0 font-mono text-[10px] text-muted-foreground">
            Pointer Alignment
          </div>
          <div
            className="flex gap-1 transition-all duration-300"
            style={{ paddingLeft: `${alignmentOffset * 40}px` }}
          >
            {pattern.split("").map((_, pIdx) => {
              const isActivePat = pIdx === patIdx;
              return (
                <div
                  key={`sightline-${pIdx}`}
                  className="flex justify-center items-center size-9"
                >
                  {isActivePat && (
                    <div className="flex flex-col items-center animate-bounce">
                      <div className="h-2 w-0.5 bg-amber-400" />
                      <span className="font-mono text-[9px] font-black text-amber-400">
                        j={pIdx}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pattern Track (P) with dynamic shift padding */}
        <div className="flex items-center gap-2">
          <div className="w-24 shrink-0 font-mono text-xs font-bold text-amber-400 flex items-center gap-1">
            <span>Pattern P:</span>
            <span className="text-[10px] text-muted-foreground font-normal">[{pattern.length}]</span>
          </div>
          <div
            className="flex gap-1 transition-all duration-300"
            style={{ paddingLeft: `${alignmentOffset * 40}px` }}
          >
            {pattern.split("").map((ch, pIdx) => {
              const isCurrentPat = pIdx === patIdx;
              const isConfirmed = pIdx < patIdx;

              return (
                <div
                  key={`pat-ch-${pIdx}`}
                  id={`pattern-cell-${pIdx}`}
                  className={`flex flex-col items-center justify-center size-9 rounded-lg border font-mono text-xs font-bold transition-all ${
                    isCurrentPat
                      ? isMatch
                        ? "border-emerald-500 bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 font-black scale-105"
                        : isMismatch
                        ? "border-rose-500 bg-rose-500 text-white ring-2 ring-rose-400 font-black scale-105"
                        : "border-amber-400 bg-amber-400 text-slate-950 font-black scale-105"
                      : isConfirmed
                      ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-300"
                      : "border-border/60 bg-card/60 text-foreground"
                  }`}
                >
                  <span className="text-sm font-black">{ch}</span>
                  <span className="text-[8px] text-muted-foreground font-normal">{pIdx}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LPS / π-Table (Longest Proper Prefix which is also Suffix) */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-card/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h4 className="font-mono text-xs font-bold text-foreground">
              LPS / π-Table (Longest Prefix-Suffix Array)
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground">
            π[i] = Length of longest proper prefix of P[0..i] that is also a suffix of P[0..i]
          </span>
        </div>

        {/* LPS Cells Grid */}
        <div className="flex flex-wrap gap-2 pt-1">
          {lps.map((val, idx) => {
            const isPatActive = patIdx === idx;
            const isPrevFallback = patIdx > 0 && idx === patIdx - 1;

            return (
              <div
                key={`lps-box-${idx}`}
                id={`lps-box-${idx}`}
                className={`flex flex-col items-center rounded-xl border p-2.5 font-mono min-w-[56px] transition-all ${
                  isPatActive
                    ? "border-primary bg-primary/20 text-primary ring-2 ring-primary/40 scale-105 shadow-sm"
                    : isPrevFallback
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-border/70 bg-background/60 text-foreground"
                }`}
              >
                <span className="text-[9px] text-muted-foreground font-semibold">
                  P[{idx}]
                </span>
                <span className="text-base font-black text-foreground">
                  {pattern[idx] ?? "-"}
                </span>
                <div className="mt-1 flex items-center gap-1 rounded bg-background/90 px-1.5 py-0.5 border border-border/50">
                  <span className="text-[9px] text-muted-foreground font-bold">π =</span>
                  <span className="text-xs font-black text-emerald-400">{val}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* LPS Explanation Card for Current State */}
        {patIdx > 0 && patIdx <= pattern.length && (
          <div className="mt-2 flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
            <Info className="size-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-emerald-300">
                Fallback Insight at j = {patIdx} (Using π[{patIdx - 1}] = {lps[patIdx - 1]}):
              </span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Matched prefix <code className="text-emerald-400 font-bold">"{pattern.slice(0, patIdx)}"</code> has
                longest proper prefix-suffix <code className="text-amber-300 font-bold">"{pattern.slice(0, lps[patIdx - 1])}"</code>.
                If mismatch occurs, jump directly to <span className="font-bold text-foreground">j = {lps[patIdx - 1]}</span> without re-comparing the first {lps[patIdx - 1]} characters!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Discovered Occurrences */}
      {kmp?.matchedIndices && kmp.matchedIndices.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
          <span className="font-mono text-xs font-bold text-emerald-300">
            Pattern Matches Discovered at starting indices:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {kmp.matchedIndices.map((mIdx) => (
              <span
                key={`match-idx-${mIdx}`}
                className="rounded-md bg-emerald-950 border border-emerald-400/50 px-2 py-0.5 font-mono text-xs font-black text-emerald-300"
              >
                Index {mIdx}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 2. RABIN-KARP & POLYNOMIAL ROLLING HASH
// ==========================================
function RabinKarpTabRenderer({
  rabin,
  fallbackText,
  fallbackPattern,
}: {
  rabin: RabinKarpAlgorithmState | null;
  fallbackText?: string | null;
  fallbackPattern?: string | null;
}) {
  const text = rabin?.text ?? fallbackText ?? "ABABDABACDABABCABAB";
  const pattern = rabin?.pattern ?? fallbackPattern ?? "ABABC";
  const base = rabin?.base ?? 26;
  const mod = rabin?.modulus ?? 1000000007;
  const windowStart = rabin?.windowStart ?? 0;
  const windowLength = rabin?.windowLength ?? pattern.length;

  const patternHash = rabin?.patternHash ?? computePolyHash(pattern, base, mod);
  const windowSubstr = text.slice(windowStart, windowStart + windowLength);
  const windowHash = rabin?.windowHash ?? computePolyHash(windowSubstr, base, mod);

  const isHashMatch =
    rabin?.isHashMatch ?? String(patternHash) === String(windowHash);
  const isSpurious = rabin?.isSpuriousHit ?? false;

  return (
    <div className="flex flex-col gap-5">
      {/* Hash Modulus Math Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Pattern Hash Card */}
        <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-background/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">
              Target Pattern Hash H(P)
            </span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
              Pattern: "{pattern}"
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span className="font-mono text-xl font-black text-primary">
              {String(patternHash)}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              (mod {mod})
            </span>
          </div>
        </div>

        {/* Window Hash Card */}
        <div
          className={`flex flex-col gap-1 rounded-xl border p-3.5 transition-all ${
            isHashMatch
              ? isSpurious
                ? "border-amber-500/60 bg-amber-500/10"
                : "border-emerald-500/60 bg-emerald-500/10"
              : "border-border/80 bg-background/60"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">
              Window Hash H(W)
            </span>
            <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[9px] font-bold text-foreground">
              Window: "{windowSubstr}"
            </span>
          </div>
          <div className="flex items-baseline gap-2 pt-1">
            <span
              className={`font-mono text-xl font-black ${
                isHashMatch
                  ? isSpurious
                    ? "text-amber-400"
                    : "text-emerald-400"
                  : "text-foreground"
              }`}
            >
              {String(windowHash)}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              (pos {windowStart}..{windowStart + windowLength - 1})
            </span>
          </div>
        </div>

        {/* Modulus Math Constants */}
        <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-background/60 p-3.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">
            Polynomial Hash Constants
          </span>
          <div className="flex flex-col gap-0.5 pt-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Radix Base B:</span>
              <span className="font-bold text-foreground">{base}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modulus M:</span>
              <span className="font-bold text-foreground">{mod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">B^(m-1) mod M:</span>
              <span className="font-bold text-cyan-400">
                {rabin?.highestPower ?? Math.pow(base, windowLength - 1) % mod}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sliding Window Track on Text Stream */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/40 p-4 overflow-x-auto">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Zap className="size-3.5 text-amber-400" />
            Sliding Hash Window Track [pos {windowStart}..{windowStart + windowLength - 1}]
          </span>
          {isHashMatch && (
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-black ${
                isSpurious
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {isSpurious ? "⚠️ Spurious Collision" : "✓ Hash Match Confirmed"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <div className="w-20 shrink-0 font-mono text-xs font-bold text-cyan-400">
            Text:
          </div>
          <div className="flex gap-1 relative">
            {text.split("").map((ch, idx) => {
              const isInsideWindow =
                idx >= windowStart && idx < windowStart + windowLength;
              const isLeftOut = idx === windowStart - 1;
              const isRightIn = idx === windowStart + windowLength - 1;

              return (
                <div
                  key={`rk-cell-${idx}`}
                  className={`flex flex-col items-center justify-center size-9 rounded-lg border font-mono text-xs font-bold transition-all ${
                    isInsideWindow
                      ? isHashMatch
                        ? isSpurious
                          ? "border-amber-400 bg-amber-500/20 text-amber-300 ring-2 ring-amber-400/40 font-black scale-105"
                          : "border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/40 font-black scale-105"
                        : "border-primary bg-primary/20 text-primary font-black"
                      : "border-border/60 bg-card/60 text-muted-foreground"
                  }`}
                >
                  <span className="text-sm">{ch}</span>
                  <span className="text-[8px] text-muted-foreground font-normal">{idx}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rolling Hash Arithmetic Breakdown Card */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card/50 p-4">
        <div className="flex items-center gap-2">
          <Binary className="size-4 text-primary" />
          <h4 className="font-mono text-xs font-bold text-foreground">
            O(1) Rolling Hash Modulus Update Step
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2">
          <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-background/70 p-2.5 font-mono text-xs">
            <span className="text-[10px] text-rose-400 font-bold">1. Remove Left Char:</span>
            <span className="text-muted-foreground text-[11px]">
              (H - T[L] · B^(m-1)) mod M
            </span>
            <span className="font-bold text-foreground">
              Char: '{text[Math.max(0, windowStart - 1)] ?? "-"}'
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-background/70 p-2.5 font-mono text-xs">
            <span className="text-[10px] text-sky-400 font-bold">2. Shift Radix:</span>
            <span className="text-muted-foreground text-[11px]">
              multiply remainder by B = {base}
            </span>
            <span className="font-bold text-foreground">
              (Rem · {base}) mod {mod}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-background/70 p-2.5 font-mono text-xs">
            <span className="text-[10px] text-emerald-400 font-bold">3. Add Right Char:</span>
            <span className="text-muted-foreground text-[11px]">
              + T[R+1] mod M
            </span>
            <span className="font-bold text-foreground">
              Char: '{text[windowStart + windowLength - 1] ?? "-"}'
            </span>
          </div>
        </div>

        {rabin?.rollingFormula && (
          <div className="mt-2 rounded-lg bg-background/90 p-2.5 border border-border/60 font-mono text-xs text-primary">
            Formula: {rabin.rollingFormula}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 3. AHO-CORASICK AUTOMATON
// ==========================================
function AhoCorasickTabRenderer({
  aho,
  fallbackText,
  fallbackPattern,
}: {
  aho: AhoCorasickState | null;
  fallbackText?: string | null;
  fallbackPattern?: string | null;
}) {
  const keywords = aho?.keywords ?? ["he", "she", "his", "hers"];
  const text = aho?.text ?? fallbackText ?? "ushers";
  const textIdx = aho?.textIndex ?? 0;
  const currentId = aho?.currentStateId ?? "0";
  const nodes = aho?.nodes ?? buildDefaultAhoNodes(keywords);

  return (
    <div className="flex flex-col gap-5">
      {/* Keywords Set Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-3.5">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-4 text-primary" />
          <span className="font-mono text-xs font-bold text-foreground">
            Multi-Pattern Dictionary Keywords:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {keywords.map((kw, i) => (
              <span
                key={`kw-${i}`}
                className="rounded-lg bg-primary/10 border border-primary/30 px-2 py-0.5 font-mono text-xs font-black text-primary"
              >
                "{kw}"
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 font-mono text-xs">
            <span className="text-muted-foreground font-semibold">Active State:</span>
            <span className="font-black text-primary">Node {String(currentId)}</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 font-mono text-xs">
            <span className="text-muted-foreground font-semibold">Input Char:</span>
            <span className="font-black text-amber-400">
              '{text[textIdx] ?? "EOF"}'
            </span>
          </div>
        </div>
      </div>

      {/* Trie Automaton Graph with Goto & Failure Links */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-background/40 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-xs font-bold text-foreground flex items-center gap-2">
            <GitBranch className="size-4 text-teal-400" />
            Trie Automaton: Goto Edges (Solid) &amp; Suffix Failure Links (Dashed)
          </h4>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-teal-400">
              <span className="size-2 rounded-full bg-teal-400" />
              Goto Transition
            </span>
            <span className="flex items-center gap-1 text-purple-400">
              <span className="size-2 rounded-full bg-purple-400" />
              Suffix Failure Link
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="size-2 rounded-full bg-amber-400" />
              Dict Match Link
            </span>
          </div>
        </div>

        {/* Nodes Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-2">
          {nodes.map((node) => {
            const isCurrent = String(node.id) === String(currentId);
            const isRoot = node.isRoot || node.id === "0" || node.id === 0;

            return (
              <div
                key={`aho-node-${node.id}`}
                id={`aho-node-${node.id}`}
                className={`flex flex-col gap-1 rounded-xl border p-2.5 transition-all ${
                  isCurrent
                    ? "border-primary bg-primary/20 text-primary ring-2 ring-primary/40 scale-105 shadow-md"
                    : node.isTerminal
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : "border-border/70 bg-card/60 text-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">
                    #{String(node.id)}
                  </span>
                  {node.isTerminal && (
                    <span className="rounded bg-emerald-500/20 px-1 text-[8px] font-black text-emerald-400">
                      EMIT
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center py-1">
                  <span className="font-mono text-lg font-black text-foreground">
                    {isRoot ? "ROOT" : `'${node.char}'`}
                  </span>
                </div>

                {/* Suffix Failure Link Target */}
                {node.failNodeId !== undefined && node.failNodeId !== null && (
                  <div className="flex items-center justify-between text-[9px] font-mono text-purple-300 bg-purple-950/40 rounded px-1.5 py-0.5 border border-purple-500/30">
                    <span>Fail ➔</span>
                    <span className="font-black">#{String(node.failNodeId)}</span>
                  </div>
                )}

                {/* Emitted Patterns List */}
                {node.outputPatterns && node.outputPatterns.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {node.outputPatterns.map((pat, pi) => (
                      <span
                        key={`out-${pi}`}
                        className="rounded bg-amber-500/20 px-1 py-0.2 text-[8px] font-black text-amber-300"
                      >
                        "{pat}"
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Emitted Matches Stream Log */}
      {aho?.emittedMatches && aho.emittedMatches.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-emerald-300">
              Discovered Multi-Pattern Matches in Text Stream:
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {aho.emittedMatches.map((m, idx) => (
              <div
                key={`aho-match-${idx}`}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 px-2.5 py-1 font-mono text-xs text-emerald-300"
              >
                <span className="font-black">"{m.pattern}"</span>
                <span className="text-[10px] text-muted-foreground">
                  [{m.startIndex}..{m.endIndex}]
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// HELPER ALGORITHMIC UTILITIES
// ==========================================
function computeDefaultLPS(pattern: string): number[] {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;
  let i = 1;

  while (i < pattern.length) {
    if (pattern[i] === pattern[len]) {
      len++;
      lps[i] = len;
      i++;
    } else {
      if (len !== 0) {
        len = lps[len - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
  }
  return lps;
}

function computePolyHash(str: string, base: number, mod: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * base + str.charCodeAt(i)) % mod;
  }
  return hash;
}

function buildDefaultAhoNodes(keywords: string[]): AhoCorasickNode[] {
  // Generates a mock trie for visualizer preview if backend trace is not provided
  return [
    { id: "0", char: "ROOT", isRoot: true, failNodeId: "0" },
    { id: "1", char: "h", parentId: "0", failNodeId: "0" },
    { id: "2", char: "e", parentId: "1", failNodeId: "0", isTerminal: true, outputPatterns: ["he"] },
    { id: "3", char: "i", parentId: "1", failNodeId: "0" },
    { id: "4", char: "s", parentId: "3", failNodeId: "0", isTerminal: true, outputPatterns: ["his"] },
    { id: "5", char: "s", parentId: "0", failNodeId: "0" },
    { id: "6", char: "h", parentId: "5", failNodeId: "1" },
    { id: "7", char: "e", parentId: "6", failNodeId: "2", isTerminal: true, outputPatterns: ["she", "he"] },
    { id: "8", char: "r", parentId: "2", failNodeId: "0" },
    { id: "9", char: "s", parentId: "8", failNodeId: "5", isTerminal: true, outputPatterns: ["hers"] },
  ];
}
