import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Activity,
  Gauge,
  Cpu,
  Layers,
  Sliders,
  TrendingUp,
  Sparkles,
  Info,
  Clock,
  Zap,
} from "lucide-react";
import type { VizStep } from "@/lib/problems";

interface AsymptoticComplexityVisualizerProps {
  currentStepIndex: number;
  totalSteps: number;
  steps: VizStep[];
  estimatedBigO: string;
  peakAuxMemory: number;
  onClose?: () => void;
}

export function AsymptoticComplexityVisualizer({
  currentStepIndex,
  totalSteps,
  steps,
  estimatedBigO,
  peakAuxMemory,
}: AsymptoticComplexityVisualizerProps) {
  const [activeTab, setActiveTab] = useState<"profiler" | "growth" | "breakdown">("profiler");
  const [inputN, setInputN] = useState<number>(100);

  // 1. Build Step-by-Step Profiling Timeline Data
  const profileTimelineData = useMemo(() => {
    let cumOps = 0;
    let totalComparisons = 0;
    let totalMutations = 0;
    let totalPushes = 0;
    let totalPops = 0;

    return steps.map((s, idx) => {
      const isPastOrCurrent = idx <= currentStepIndex;
      cumOps += 1;

      let stepComparisons = 0;
      let stepMutations = 0;
      let stepPushes = 0;
      let stepPops = 0;

      const desc = (s.desc ?? "").toLowerCase();
      if (/compare|check|equal|match|found|==|<|>/.test(desc)) {
        stepComparisons += 1;
        totalComparisons += 1;
      }
      if (/put|insert|add|append|write|update|set/.test(desc)) {
        stepMutations += 1;
        totalMutations += 1;
        stepPushes += 1;
        totalPushes += 1;
      }
      if (/pop|remove|delete|poll|shift|evict/.test(desc)) {
        stepMutations += 1;
        totalMutations += 1;
        stepPops += 1;
        totalPops += 1;
      }

      const stackSize = Array.isArray(s.stack) ? s.stack.length : 0;
      const queueSize = Array.isArray(s.queue) ? s.queue.length : 0;
      const mapSize = s.map ? Object.keys(s.map).length : 0;
      const setSize = Array.isArray(s.set) ? s.set.length : 0;
      const bufferSize = Math.max(stackSize, queueSize, mapSize, setSize);

      // Theoretical O(N) linear benchmark
      const linearTheoretical = Math.round(((idx + 1) / Math.max(1, totalSteps)) * totalSteps);
      // Theoretical O(N log N)
      const nLogNTheoretical = Math.round(
        (idx + 1) * Math.log2(Math.max(2, idx + 1)) * 0.75,
      );

      return {
        step: `S${idx + 1}`,
        stepNum: idx + 1,
        cumulativeOps: cumOps,
        bufferSize,
        stepComparisons,
        stepMutations,
        totalComparisons,
        totalMutations,
        totalPushes,
        totalPops,
        linearBenchmark: linearTheoretical,
        nLogNBenchmark: nLogNTheoretical,
        isCurrent: idx === currentStepIndex,
        isPastOrCurrent,
      };
    });
  }, [steps, currentStepIndex, totalSteps]);

  // Current step telemetry snapshot
  const currentSnapshot = profileTimelineData[currentStepIndex] ?? profileTimelineData[0];

  // 2. Build Multi-Complexity Growth Curves for Input Size N
  const growthCurveData = useMemo(() => {
    const points = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
    return points.map((n) => {
      const o1 = 1;
      const oLogN = Math.round(Math.log2(n) * 10) / 10;
      const oN = n;
      const oNLogN = Math.round(n * Math.log2(n));
      const oN2 = Math.min(1000000, n * n);

      return {
        n: `N=${n}`,
        nVal: n,
        "O(1) Constant": o1,
        "O(log N) Logarithmic": oLogN,
        "O(N) Linear": oN,
        "O(N log N) Linearithmic": oNLogN,
        "O(N²) Quadratic": oN2 > 10000 ? 10000 : oN2,
      };
    });
  }, []);

  // Compute exact operation counts and approximate latencies for the selected input N
  const complexityCalculations = useMemo(() => {
    const N = inputN;
    const logN = Math.max(1, Math.round(Math.log2(N)));
    const nLogN = Math.round(N * Math.log2(N));
    const n2 = N * N;
    const twoN = N <= 30 ? Math.pow(2, N) : Infinity;

    const clockSpeedGhz = 2.5; // 2.5 GHz CPU
    const formatTime = (ops: number) => {
      if (!Number.isFinite(ops)) return "> 1000 Years (Intractable)";
      const seconds = ops / (clockSpeedGhz * 1e9);
      if (seconds < 1e-6) return `${(seconds * 1e9).toFixed(1)} ns`;
      if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(1)} μs`;
      if (seconds < 1) return `${(seconds * 1e3).toFixed(2)} ms`;
      if (seconds < 60) return `${seconds.toFixed(2)} s`;
      return `${(seconds / 60).toFixed(1)} min`;
    };

    return [
      {
        notation: "O(1)",
        name: "Constant",
        ops: 1,
        latency: formatTime(1),
        status: estimatedBigO === "O(1)" ? "current" : "better",
        color: "text-emerald-400",
      },
      {
        notation: "O(log N)",
        name: "Logarithmic",
        ops: logN,
        latency: formatTime(logN),
        status: estimatedBigO.includes("log N") && !estimatedBigO.includes("N log N") ? "current" : "good",
        color: "text-cyan-400",
      },
      {
        notation: "O(N)",
        name: "Linear",
        ops: N,
        latency: formatTime(N),
        status: estimatedBigO === "O(N)" || estimatedBigO === "O(V + E)" ? "current" : "standard",
        color: "text-blue-400",
      },
      {
        notation: "O(N log N)",
        name: "Linearithmic",
        ops: nLogN,
        latency: formatTime(nLogN),
        status: estimatedBigO.includes("N log N") ? "current" : "standard",
        color: "text-amber-400",
      },
      {
        notation: "O(N²)",
        name: "Quadratic",
        ops: n2,
        latency: formatTime(n2),
        status: estimatedBigO.includes("N²") || estimatedBigO.includes("M × N") ? "current" : "caution",
        color: "text-rose-400",
      },
      {
        notation: "O(2ᴺ)",
        name: "Exponential",
        ops: twoN,
        latency: formatTime(twoN),
        status: estimatedBigO.includes("2ᴺ") ? "current" : "danger",
        color: "text-purple-400",
      },
    ];
  }, [inputN, estimatedBigO]);

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-gradient-to-b from-card/90 via-card/80 to-background/90 p-5 shadow-lg backdrop-blur-md animate-fade font-sans">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary shadow-xs">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                Asymptotic Complexity &amp; Operation Profiler
              </h3>
              <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 border border-accent/30 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                <Gauge className="size-3" />
                <span>{estimatedBigO}</span>
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Live operation profiling, auxiliary memory footprint &amp; theoretical scaling curves
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center rounded-xl border border-border/60 bg-background/60 p-1 font-mono text-xs shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("profiler")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
              activeTab === "profiler"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="size-3.5" />
            <span>Step Profiler</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("growth")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
              activeTab === "growth"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Gauge className="size-3.5" />
            <span>Big-O Growth</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("breakdown")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
              activeTab === "breakdown"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Info className="size-3.5" />
            <span>Analysis</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Real-Time Step Profiler & Timeline */}
      {activeTab === "profiler" && (
        <div className="flex flex-col gap-4 animate-fade">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                <Cpu className="size-3 text-primary" />
                <span>Active Step Ops</span>
              </div>
              <div className="mt-1 text-base font-bold text-primary">
                {currentSnapshot?.cumulativeOps ?? currentStepIndex + 1}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  / {profileTimelineData[profileTimelineData.length - 1]?.cumulativeOps ?? totalSteps} total
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                <Zap className="size-3 text-accent" />
                <span>Comparisons / Probes</span>
              </div>
              <div className="mt-1 text-base font-bold text-accent">
                {currentSnapshot?.totalComparisons ?? 0}
                <span className="text-xs font-normal text-muted-foreground ml-1">queries</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                <Layers className="size-3 text-emerald-400" />
                <span>Auxiliary Memory</span>
              </div>
              <div className="mt-1 text-base font-bold text-emerald-400">
                {currentSnapshot?.bufferSize ?? 0}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  (peak: {peakAuxMemory})
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/70 p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                <Clock className="size-3 text-cyan-400" />
                <span>Execution Frame</span>
              </div>
              <div className="mt-1 text-base font-bold text-cyan-400">
                Step {currentStepIndex + 1}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({Math.round(((currentStepIndex + 1) / totalSteps) * 100)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Area Chart */}
          <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-inner">
            <div className="mb-2 flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="size-3.5 text-primary" />
                Cumulative Operations &amp; Buffer Load vs. Step
              </span>
              <span className="text-[11px] text-muted-foreground">
                Target Bound: <strong className="text-primary">{estimatedBigO}</strong>
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={profileTimelineData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="opsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="step"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "monospace" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(255,255,255,0.15)",
                      borderRadius: "0.75rem",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", fontFamily: "monospace", paddingTop: "8px" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeOps"
                    name="Cumulative Operations"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#opsGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="bufferSize"
                    name="Aux Memory Buffer"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#memGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="linearBenchmark"
                    name="O(N) Linear Benchmark"
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Big-O Theoretical Growth Visualizer */}
      {activeTab === "growth" && (
        <div className="flex flex-col gap-4 animate-fade">
          {/* Interactive N Input Slider */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/70 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sliders className="size-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">
                  Simulate Input Size: <strong className="text-primary font-mono text-sm">N = {inputN.toLocaleString()}</strong>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Adjust N to observe asymptotic divergence across complexity classes
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="range"
                min="10"
                max="10000"
                step="50"
                value={inputN}
                onChange={(e) => setInputN(Number(e.target.value))}
                className="w-full sm:w-48 accent-primary cursor-pointer"
              />
              <div className="flex gap-1">
                {[100, 1000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInputN(preset)}
                    className={`rounded-md px-2 py-1 font-mono text-[10px] font-bold border transition-colors ${
                      inputN === preset
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 bg-card hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Growth Curve Chart */}
          <div className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-inner">
            <div className="mb-2 text-xs font-mono font-bold text-foreground flex items-center justify-between">
              <span>Theoretical Operation Growth (Log-Scale Comparison)</span>
              <span className="text-[10px] text-muted-foreground">N = 1 to 1024</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="n"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "monospace" }}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "monospace" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderColor: "rgba(255,255,255,0.15)",
                      borderRadius: "0.75rem",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }} />
                  <Line type="monotone" dataKey="O(1) Constant" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="O(log N) Logarithmic" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="O(N) Linear" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="O(N log N) Linearithmic" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="O(N²) Quadratic" stroke="#f43f5e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Clock Cycles & Runtime Estimation Table */}
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-background/70 p-3">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[10px] text-muted-foreground uppercase">
                  <th className="pb-2 pl-2">Complexity Class</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Operations for N={inputN.toLocaleString()}</th>
                  <th className="pb-2">Est. Latency (2.5GHz CPU)</th>
                  <th className="pb-2 pr-2">Your Algorithm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {complexityCalculations.map((row) => (
                  <tr
                    key={row.notation}
                    className={`transition-colors ${
                      row.status === "current"
                        ? "bg-primary/15 font-bold"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className={`py-2 pl-2 font-bold ${row.color}`}>{row.notation}</td>
                    <td className="py-2 text-foreground/80">{row.name}</td>
                    <td className="py-2 text-foreground font-bold">
                      {Number.isFinite(row.ops) ? row.ops.toLocaleString() : "∞"}
                    </td>
                    <td className="py-2 text-muted-foreground">{row.latency}</td>
                    <td className="py-2 pr-2">
                      {row.status === "current" ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/20 border border-primary/40 px-2 py-0.5 text-[10px] text-primary font-bold animate-pulse">
                          <Sparkles className="size-3" />
                          Current Algorithm
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Theoretical Analysis & Invariant Breakdown */}
      {activeTab === "breakdown" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade font-mono text-xs">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <Clock className="size-4 text-primary" />
                Time Complexity
              </span>
              <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary border border-primary/30">
                {estimatedBigO}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground font-sans">
              The algorithm processes the collection in <strong>{estimatedBigO}</strong> time. In the optimal case, traversal halts early upon finding the target invariant or completing linear scans without quadratic nesting.
            </p>
            <div className="mt-1 pt-2 border-t border-border/40 flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Best Case:</span>
                <span className="text-emerald-400 font-bold">O(1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Case:</span>
                <span className="text-primary font-bold">{estimatedBigO}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Worst Case:</span>
                <span className="text-accent font-bold">{estimatedBigO}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                <Layers className="size-4 text-emerald-400" />
                Space Complexity
              </span>
              <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                {peakAuxMemory > 0 ? "O(N) Auxiliary" : "O(1) In-Place"}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground font-sans">
              {peakAuxMemory > 0
                ? `Uses auxiliary heap/stack/map structures with a measured peak buffer of ${peakAuxMemory} entries to maintain search states.`
                : "Operates strictly in-place with O(1) auxiliary pointer variables without allocating additional dynamic memory structures."}
            </p>
            <div className="mt-1 pt-2 border-t border-border/40 flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auxiliary Buffer:</span>
                <span className="text-emerald-400 font-bold">{peakAuxMemory} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Call Stack Depth:</span>
                <span className="text-foreground font-bold">O(1)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
