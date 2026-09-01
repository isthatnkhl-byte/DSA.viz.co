import { useState } from "react";
import { Zap, Clock, HardDrive, ArrowRight, CheckCircle2, Flame, Code2, Cpu, Activity } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Approach {
  id: "brute" | "better" | "optimal";
  name: string;
  badge: string;
  time: string;
  space: string;
  opsCount: number;
  opsLabel: string;
  opsPercent: number; // For the visual bar
  latency: string;
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
    time: "O(n²)",
    space: "O(1)",
    opsCount: 1000000,
    opsLabel: "1,000,000 operations",
    opsPercent: 100,
    latency: "1,420 ms (TLE Risk)",
    summary:
      "Checks every possible pair (i, j) with two nested loops. Time explodes quadratically as input size grows.",
    aiVerdict: "🔴 TLE (Time Limit Exceeded) on large interview test cases (n > 10,000).",
    codeSnippet: `for (int i = 0; i < n; i++) {\n  for (int j = i + 1; j < n; j++) {\n    if (nums[i] + nums[j] == target) return {i, j};\n  }\n}`,
    accentColor: "from-rose-500 to-red-600 text-rose-400 border-rose-500/40 bg-rose-500/10",
  },
  {
    id: "better",
    name: "Sort + Two Pointers",
    badge: "Intermediate",
    time: "O(n log n)",
    space: "O(1)",
    opsCount: 10000,
    opsLabel: "10,000 operations",
    opsPercent: 20,
    latency: "14.2 ms",
    summary:
      "Sort the array first in O(n log n), then glide two pointers inwards from left and right in O(n).",
    aiVerdict: "🟡 99% faster than brute force, but mutates array indices & adds sorting overhead.",
    codeSnippet: `sort(nums.begin(), nums.end());\nint l = 0, r = n - 1;\nwhile (l < r) {\n  int sum = nums[l] + nums[r];\n  if (sum == target) return {l, r};\n  else if (sum < target) l++;\n  else r--;\n}`,
    accentColor: "from-amber-500 to-yellow-600 text-amber-400 border-amber-500/40 bg-amber-500/10",
  },
  {
    id: "optimal",
    name: "Hash Map Complement",
    badge: "Optimal Invariant",
    time: "O(n)",
    space: "O(n)",
    opsCount: 1000,
    opsLabel: "1,000 operations",
    opsPercent: 4,
    latency: "1.1 ms (99.8% Faster)",
    summary:
      "One linear pass storing seen values in an unordered hash map. Instant O(1) expected lookups for target - num.",
    aiVerdict: "🟢 Optimal Invariant! Linear scan with minimal overhead. 100% FAANG Approved.",
    codeSnippet: `unordered_map<int, int> seen;\nfor (int i = 0; i < n; i++) {\n  int complement = target - nums[i];\n  if (seen.count(complement)) return {seen[complement], i};\n  seen[nums[i]] = i;\n}`,
    accentColor: "from-emerald-500 to-teal-500 text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  },
];

export function ComplexityLeap() {
  const [selectedId, setSelectedId] = useState<"brute" | "better" | "optimal">("brute");
  const [activeTab, setActiveTab] = useState<"visual" | "code">("visual");

  const approach = APPROACHES.find((a) => a.id === selectedId) ?? APPROACHES[0]!;

  return (
    <section className="relative py-16 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto w-full my-8">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-accent/15 to-primary/15 rounded-3xl blur-3xl -z-10 pointer-events-none" />

      <div className="rounded-3xl border border-border/80 bg-card/85 p-6 sm:p-10 md:p-12 backdrop-blur-2xl shadow-2xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left Side: Interactive Approach Sandbox */}
          <div className="rounded-2xl border border-border/80 bg-background/85 p-5 sm:p-6 backdrop-blur-xl shadow-xl transition-all duration-300">
            {/* Header & Sub-Tabs */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-rose-500/80" />
                <span className="size-2.5 rounded-full bg-amber-500/80" />
                <span className="size-2.5 rounded-full bg-emerald-500/80" />
                <span className="font-mono text-xs text-foreground font-bold ml-1">
                  Two Sum • Real Complexity Collapse
                </span>
              </div>

              {/* Visual vs Code view toggle */}
              <div className="inline-flex rounded-lg border border-border/70 bg-secondary/50 p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveTab("visual")}
                  className={`px-2.5 py-0.5 rounded-md transition-all ${
                    activeTab === "visual"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Metrics
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className={`px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                    activeTab === "code"
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code2 className="size-3" />
                  <span>Code</span>
                </button>
              </div>
            </div>

            {/* Approach Selector Buttons */}
            <div className="flex flex-wrap gap-2 mb-6" role="tablist">
              {APPROACHES.map((app) => {
                const isSelected = app.id === selectedId;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedId(app.id)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-xs transition-all duration-200 border ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20 scale-[1.02]"
                        : "border-border/80 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`size-2 rounded-full ${
                        app.id === "brute"
                          ? "bg-rose-500 animate-pulse"
                          : app.id === "better"
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                      }`}
                    />
                    <span>{app.name}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === "visual" ? (
              <>
                {/* Time & Space & Latency Meters */}
                <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 mb-6">
                  <div>
                    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                      <Clock className="size-3 text-primary" /> Time
                    </div>
                    <div
                      className={`font-display text-2xl sm:text-3xl font-black transition-all duration-300 ${
                        approach.id === "optimal"
                          ? "text-emerald-400"
                          : approach.id === "better"
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {approach.time}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                      <HardDrive className="size-3 text-accent" /> Space
                    </div>
                    <div className="font-display text-2xl sm:text-3xl font-black text-foreground transition-all duration-300">
                      {approach.space}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                      <Activity className="size-3 text-emerald-400" /> Latency (n=1k)
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-bold text-foreground transition-all duration-300 mt-1">
                      {approach.latency}
                    </div>
                  </div>
                </div>

                {/* Operations Comparison Bar */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                      CPU Cycles / Operations (n = 1,000)
                    </span>
                    <span
                      className={`font-bold transition-all duration-300 ${
                        approach.id === "optimal"
                          ? "text-emerald-400"
                          : approach.id === "better"
                            ? "text-amber-400"
                            : "text-rose-400"
                      }`}
                    >
                      {approach.opsLabel}
                    </span>
                  </div>

                  {/* Visual Bar with animated width */}
                  <div className="h-4 w-full overflow-hidden rounded-full bg-secondary/80 p-0.5 border border-border/80">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        approach.id === "optimal"
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/40"
                          : approach.id === "better"
                            ? "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-md shadow-amber-500/40"
                            : "bg-gradient-to-r from-rose-500 to-red-600 shadow-md shadow-rose-500/40"
                      }`}
                      style={{ width: `${approach.opsPercent}%` }}
                    />
                  </div>
                </div>

                {/* Explanation & AI Invariant Verdict */}
                <div className="rounded-xl border border-border/70 bg-card/70 p-4 space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {approach.summary}
                  </p>
                  <div className="font-mono text-[11px] font-semibold text-foreground pt-2 border-t border-border/40">
                    {approach.aiVerdict}
                  </div>
                </div>
              </>
            ) : (
              /* Code Snippet View */
              <div className="rounded-xl border border-border/70 bg-card/80 p-4 font-mono text-xs mb-4">
                <div className="flex items-center justify-between text-muted-foreground text-[10px] pb-2 border-b border-border/40 mb-3">
                  <span className="font-bold text-primary">{approach.name} C++ Implementation</span>
                  <span>{approach.time} • {approach.space}</span>
                </div>
                <pre className="text-foreground text-xs leading-relaxed overflow-x-auto">
                  <code>{approach.codeSnippet}</code>
                </pre>
              </div>
            )}

            <div className="mt-4 text-[11px] font-mono text-muted-foreground text-center">
              ↑ Switch approaches above to experience the architectural evolution.
            </div>
          </div>

          {/* Right Side: Philosophy & Value Proposition */}
          <div className="text-center lg:text-left space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-primary">
              <Flame className="size-3.5 text-primary" />
              <span>Algorithmic Optimization Path</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black tracking-tight text-foreground leading-[1.12]">
              Never settle for the <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent italic">
                naive baseline.
              </span>
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 font-sans">
              Top interview candidates don't just know how to write code — they understand the mathematical
              invariants that turn an $O(n^2)$ time-limit exceeded into an $O(n)$ lightning-fast solution.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 font-sans">
              With <strong>DSA.viz</strong>, you compare brute-force, intermediate heuristics, and optimal
              hash/pointer techniques side by side with real-time operations auditing.
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <Link
                to="/problems"
                className="inline-flex items-center gap-2 font-mono text-sm font-bold text-primary hover:underline decoration-primary/50 underline-offset-8 hover:translate-x-1 transition-all"
              >
                <span>Explore all 1500+ problem breakdowns</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
