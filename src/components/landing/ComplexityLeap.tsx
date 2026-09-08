import { useState, useMemo } from "react";
import { Zap, Clock, HardDrive, ArrowRight, CheckCircle2, Flame, Code2, Cpu, Activity, Gauge, Sliders, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Approach {
  id: "brute" | "better" | "optimal";
  name: string;
  badge: string;
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
  aiVerdict: string;
  codeSnippet: string;
  accentColor: string;
}

const APPROACHES: Approach[] = [
  {
    id: "brute",
    name: "Brute Force (Nested Loops)",
    badge: "Naive Approach",
    timeComplexity: "O(n²)",
    spaceComplexity: "O(1)",
    summary: "Checks every possible pair (i, j) with two nested loops. Time explodes quadratically as input size grows.",
    aiVerdict: "🔴 TLE (Time Limit Exceeded) on large interview test cases (n > 10,000).",
    codeSnippet: `// Naive Nested Loops — O(n²) Time | O(1) Space
vector<int> twoSumBrute(vector<int>& nums, int target) {
    int n = nums.size();
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (nums[i] + nums[j] == target) {
                return {i, j};
            }
        }
    }
    return {};
}`,
    accentColor: "from-rose-500 to-red-600 text-rose-400 border-rose-500/40 bg-rose-500/10",
  },
  {
    id: "better",
    name: "Sort + Two Pointers",
    badge: "Intermediate",
    timeComplexity: "O(n log n)",
    spaceComplexity: "O(1)",
    summary: "Sort the array first in O(n log n), then glide two pointers inwards from left and right in O(n).",
    aiVerdict: "🟡 99% faster than brute force, but mutates array indices & adds sorting overhead.",
    codeSnippet: `// Sort + Two Pointers — O(n log n) Time | O(1) Space
vector<int> twoSumSort(vector<int>& nums, int target) {
    // Note: requires tracking original indices with pair
    sort(nums.begin(), nums.end());
    int l = 0, r = nums.size() - 1;
    while (l < r) {
        int sum = nums[l] + nums[r];
        if (sum == target) return {l, r};
        if (sum < target) l++;
        else r--;
    }
    return {};
}`,
    accentColor: "from-amber-500 to-yellow-600 text-amber-400 border-amber-500/40 bg-amber-500/10",
  },
  {
    id: "optimal",
    name: "Hash Map Complement",
    badge: "Optimal Invariant",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    summary: "One linear pass storing seen values in an unordered hash map. Instant O(1) expected lookups for target - num.",
    aiVerdict: "🟢 Optimal Invariant! Linear scan with minimal overhead. Industry-standard optimal solution.",
    codeSnippet: `// Hash Map Single Pass — O(n) Time | O(n) Space
vector<int> twoSumOptimal(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < (int)nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}`,
    accentColor: "from-primary to-accent text-primary border-primary/40 bg-primary/10",
  },
];

const PRESET_N = [100, 1000, 10000, 50000];

export function ComplexityLeap() {
  const [selectedId, setSelectedId] = useState<"brute" | "better" | "optimal">("brute");
  const [activeTab, setActiveTab] = useState<"visual" | "code">("visual");
  const [inputSize, setInputSize] = useState<number>(1000);

  const approach = APPROACHES.find((a) => a.id === selectedId) ?? APPROACHES[0]!;

  // Mathematical telemetry based on dynamic inputSize N
  const telemetry = useMemo(() => {
    const n = inputSize;
    const bruteOps = Math.floor((n * (n - 1)) / 2);
    const betterOps = Math.floor(n * Math.log2(Math.max(2, n)) + n);
    const optimalOps = n;

    // Latency approximations (assuming modern CPU ~ 5e7 simple iterations / sec)
    const bruteMs = (bruteOps / 50000).toFixed(1);
    const betterMs = (betterOps / 50000).toFixed(2);
    const optimalMs = (optimalOps / 50000).toFixed(3);

    const isBruteTLE = bruteOps > 5000000;

    let currOps = bruteOps;
    let currMs = bruteMs;
    if (selectedId === "better") {
      currOps = betterOps;
      currMs = betterMs;
    } else if (selectedId === "optimal") {
      currOps = optimalOps;
      currMs = optimalMs;
    }

    // Relative visual percentage (log scale for sensible visual comparison)
    const maxLog = Math.log10(Math.max(bruteOps, 10));
    const brutePct = 100;
    const betterPct = Math.max(8, Math.min(100, Math.round((Math.log10(betterOps) / maxLog) * 100)));
    const optimalPct = Math.max(3, Math.min(100, Math.round((Math.log10(optimalOps) / maxLog) * 100)));

    let activeBarPct = brutePct;
    if (selectedId === "better") activeBarPct = betterPct;
    if (selectedId === "optimal") activeBarPct = optimalPct;

    return {
      n,
      bruteOps,
      betterOps,
      optimalOps,
      currOps,
      currMs,
      isBruteTLE,
      activeBarPct,
      brutePct,
      betterPct,
      optimalPct,
    };
  }, [inputSize, selectedId]);

  return (
    <section className="relative py-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full my-8">
      {/* Ambient background aura glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-accent/15 to-primary/15 rounded-3xl blur-3xl -z-10 pointer-events-none" />

      <div className="rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-10 md:p-12 backdrop-blur-2xl shadow-2xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          {/* Left Side: Interactive Approach Sandbox & Telemetry Deck */}
          <div className="rounded-2xl border border-border/80 bg-background/85 p-5 sm:p-6 backdrop-blur-xl shadow-xl transition-all duration-300">
            {/* Header & Sub-Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-rose-500/80" />
                <span className="size-2.5 rounded-full bg-amber-500/80" />
                <span className="size-2.5 rounded-full bg-emerald-500/80" />
                <span className="font-mono text-xs text-foreground font-bold ml-1">
                  Complexity Leap Telemetry • Two Sum
                </span>
              </div>

              {/* Visual vs Code view toggle */}
              <div className="inline-flex rounded-lg border border-border/70 bg-secondary/50 p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab("visual")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    activeTab === "visual"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Live Telemetry
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    activeTab === "code"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code2 className="size-3" />
                  <span>C++ Code</span>
                </button>
              </div>
            </div>

            {/* Approach Selector Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {APPROACHES.map((app) => {
                const isSelected = app.id === selectedId;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedId(app.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-mono font-bold transition-all duration-200 ${
                      isSelected
                        ? `bg-secondary shadow-md ${
                            app.id === "brute"
                              ? "border-rose-500/60 text-rose-400"
                              : app.id === "better"
                                ? "border-amber-500/60 text-amber-400"
                                : "border-primary/60 text-primary"
                          }`
                        : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-secondary/40"
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full ${
                        app.id === "brute"
                          ? "bg-rose-500 animate-pulse"
                          : app.id === "better"
                            ? "bg-amber-400"
                            : "bg-primary"
                      }`}
                    />
                    <span className="truncate">{app.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Interactive N Input Size Slider */}
            <div className="mb-6 rounded-2xl border border-border/70 bg-card/50 p-4 font-mono text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Sliders className="size-3.5 text-primary" />
                  <span className="font-bold text-foreground">Input Array Size (N):</span>
                </div>
                <span className="rounded-md bg-primary/15 border border-primary/30 px-2 py-0.5 text-xs font-bold text-primary">
                  N = {telemetry.n.toLocaleString()}
                </span>
              </div>

              <input
                type="range"
                min="50"
                max="50000"
                step="50"
                value={inputSize}
                onChange={(e) => setInputSize(Number(e.target.value))}
                className="w-full h-2 rounded-lg bg-secondary cursor-pointer accent-primary"
              />

              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2">
                <span>N = 50 (Tiny)</span>
                <div className="flex items-center gap-1.5">
                  {PRESET_N.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setInputSize(preset)}
                      className={`px-1.5 py-0.5 rounded border transition-all ${
                        inputSize === preset
                          ? "bg-primary text-primary-foreground border-primary font-bold"
                          : "border-border/60 bg-background/60 hover:bg-secondary"
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                </div>
                <span>N = 50k (Production)</span>
              </div>
            </div>

            {activeTab === "visual" ? (
              <>
                {/* Time & Space & Live Calculated Telemetry */}
                <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 mb-6">
                  <div>
                    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                      <Clock className="size-3 text-primary" /> Asymptotic
                    </div>
                    <div
                      className={`font-display text-2xl sm:text-3xl font-black transition-all duration-300 ${
                        approach.id === "optimal"
                          ? "text-primary"
                          : approach.id === "better"
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {approach.timeComplexity}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                      <HardDrive className="size-3 text-accent" /> Memory
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-black text-foreground transition-all duration-300">
                      {approach.spaceComplexity}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                      <Activity className="size-3 text-primary" /> Latency Est.
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-bold text-foreground transition-all duration-300 mt-1">
                      {telemetry.currMs} ms
                      {selectedId === "brute" && telemetry.isBruteTLE && (
                        <span className="block text-[10px] text-rose-400 font-bold">⚠️ TLE RISK</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Operations Comparison Bar */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                       Calculated CPU Operations (N = {telemetry.n.toLocaleString()})
                    </span>
                    <span
                      className={`font-bold transition-all duration-300 ${
                        approach.id === "optimal"
                          ? "text-primary"
                          : approach.id === "better"
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {telemetry.currOps.toLocaleString()} ops
                    </span>
                  </div>

                  {/* Visual Bar with dynamic animated width */}
                  <div className="h-4 w-full overflow-hidden rounded-full bg-secondary/80 p-0.5 border border-border/80">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${
                        approach.id === "optimal"
                          ? "bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/40"
                          : approach.id === "better"
                            ? "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-md shadow-amber-500/40"
                            : "bg-gradient-to-r from-rose-500 to-red-600 shadow-md shadow-rose-500/40"
                      }`}
                      style={{ width: `${telemetry.activeBarPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Brute: {telemetry.bruteOps.toLocaleString()}</span>
                    <span>Sort: {telemetry.betterOps.toLocaleString()}</span>
                    <span className="text-primary font-bold">Optimal: {telemetry.optimalOps.toLocaleString()}</span>
                  </div>
                </div>

                {/* Explanation & AI Invariant Verdict */}
                <div className="rounded-xl border border-border/70 bg-card/70 p-4 space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                    {approach.summary}
                  </p>
                  <div className="font-mono text-[11px] font-semibold text-foreground pt-2 border-t border-border/40">
                    {approach.aiVerdict}
                  </div>
                </div>
              </>
            ) : (
              /* C++ Code Display Tab */
              <div className="rounded-2xl border border-border/70 bg-secondary/40 p-4 font-mono text-xs overflow-x-auto shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 text-[10px] text-muted-foreground">
                  <span>C++20 Implementation</span>
                  <span className="text-primary font-bold">{approach.timeComplexity}</span>
                </div>
                <pre className="text-foreground leading-relaxed font-mono">
                  <code>{approach.codeSnippet}</code>
                </pre>
              </div>
            )}
          </div>

          {/* Right Side: Visual Context & Value Prop */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-primary">
              <Zap className="size-3.5" />
              <span>Intuitive Visual Transformation</span>
            </div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-[1.1]">
              Witness the <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-pixel text-3xl sm:text-4xl md:text-5xl lg:text-6xl py-2 block mt-6 mb-4 drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
                Complexity Leap.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground font-sans leading-relaxed">
              In technical interviews, the jump from <span className="font-mono text-rose-400 dark:text-rose-400 font-bold">O(n²)</span> to{" "}
              <span className="font-mono text-complement font-bold">O(n)</span> isn&apos;t just about memorizing hash tables—it is about recognizing loop invariants and eliminating redundant state traversal.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="size-6 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0 mt-0.5">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <div className="text-xs sm:text-sm font-sans">
                  <strong className="font-bold text-foreground">Interactive Scaling Benchmarks:</strong>
                  <span className="text-muted-foreground"> Drag the array size slider above to watch CPU operations drop from 50 million down to 10,000.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-6 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <div className="text-xs sm:text-sm font-sans">
                  <strong className="font-bold text-foreground">Loop Invariant Telemetry:</strong>
                  <span className="text-muted-foreground"> Each visualizer frames the mathematical proof of correctness at each step.</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-6 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shrink-0 mt-0.5">
                  <CheckCircle2 className="size-3.5" />
                </div>
                <div className="text-xs sm:text-sm font-sans">
                  <strong className="font-bold text-foreground">Real-World Interview Focus:</strong>
                  <span className="text-muted-foreground"> Master the exact optimal leaps expected by Google, Meta, and Amazon interview rubrics.</span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link
                to="/problem/$slug"
                params={{ slug: "two-sum" }}
                className="inline-flex items-center gap-2 rounded-xl btn-moving-theme-gradient px-5 py-3 font-sans text-sm font-bold tracking-wide text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95"
              >
                <span>Launch Interactive Two Sum Visualizer</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
