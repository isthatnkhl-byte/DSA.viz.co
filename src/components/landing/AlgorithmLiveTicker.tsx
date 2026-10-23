import { Link } from "@tanstack/react-router";
import { Zap, GitCommit, CheckCircle2, ArrowRight, Play, Terminal } from "lucide-react";

const ALGORITHM_ITEMS = [
  { text: "Two Sum II", badge: "Two Pointers", color: "text-complement border-complement/30 bg-complement/10" },
  { text: "Binary Search", badge: "Divide & Conquer", color: "text-accent border-accent/30 bg-accent/10" },
  { text: "Longest Substring", badge: "Sliding Window", color: "text-primary border-primary/30 bg-primary/10" },
  { text: "Invert Binary Tree", badge: "Tree DFS", color: "text-complement border-complement/30 bg-complement/10" },
  { text: "Coin Change", badge: "Dynamic Prog", color: "text-primary border-primary/30 bg-primary/10" },
  { text: "Course Schedule", badge: "Graph Kahn's", color: "text-accent border-accent/30 bg-accent/10" },
  { text: "Trapping Rain Water", badge: "Monotonic Stack", color: "text-complement border-complement/30 bg-complement/10" },
];

const COMPANY_ITEMS = [
  { text: "Google", color: "text-foreground group-hover/comp:text-primary" },
  { text: "Meta", color: "text-primary font-black" },
  { text: "Amazon", color: "text-foreground group-hover/comp:text-complement" },
  { text: "Netflix", color: "text-primary font-black" },
  { text: "Apple", color: "text-foreground group-hover/comp:text-accent" },
  { text: "Microsoft", color: "text-complement font-black" },
  { text: "Uber", color: "text-foreground group-hover/comp:text-primary" },
  { text: "Airbnb", color: "text-accent font-black" },
];

const CONCEPT_ITEMS = [
  { text: "l=2, r=3 (6+8=14) → Match Found!", color: "text-complement border-complement/30 bg-complement/10" },
  { text: "mid=3 (nums[3]=12 < 23) → Discard [0..3]", color: "text-accent border-accent/30 bg-accent/10" },
  { text: "seen['b']=true → shrink left window", color: "text-primary border-primary/30 bg-primary/10" },
  { text: "swap(node.left, node.right)", color: "text-complement border-complement/30 bg-complement/10" },
  { text: "dp[11] = min(dp[10], dp[6]) + 1", color: "text-primary border-primary/30 bg-primary/10" },
  { text: "inDegree[curr] == 0 → push to queue", color: "text-accent border-accent/30 bg-accent/10" },
];

export function AlgorithmLiveTicker() {
  const algoSet = ALGORITHM_ITEMS.concat(ALGORITHM_ITEMS);
  const companySet = COMPANY_ITEMS.concat(COMPANY_ITEMS);
  const conceptSet = CONCEPT_ITEMS.concat(CONCEPT_ITEMS);

  return (
    <div className="relative w-full border-y border-border/40 bg-card/30 backdrop-blur-xl py-5 overflow-hidden select-none my-6 flex flex-col gap-3.5 shadow-sm">
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px] opacity-15 pointer-events-none" />

      {/* Ambient gradient fade masks on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

      {/* Row 1: Algorithms (Continuous Left-to-Right Motion) */}
      <div className="flex overflow-x-hidden">
        <div
          className="ticker-track-ltr flex items-center whitespace-nowrap"
          style={{ animationDuration: "28s" }}
        >
          {[0, 1].map((half) => (
            <div key={`algo-half-${half}`} className="flex items-center gap-3 sm:gap-4 pr-3 sm:pr-4 shrink-0">
              {algoSet.map((item, idx) => (
                <div
                  key={`algo-${half}-${idx}`}
                  className="inline-flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/85 backdrop-blur-md px-3.5 py-2 text-xs transition-all duration-200 shadow-sm hover:border-primary/40 hover:shadow-md"
                >
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border border-border/50 ${item.color} bg-background/70`}
                  >
                    {item.badge}
                  </span>
                  <span className="font-bold text-foreground text-[11px] uppercase tracking-wide">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Companies (Continuous Left-to-Right Motion) */}
      <div className="flex overflow-x-hidden">
        <div
          className="ticker-track-ltr flex items-center whitespace-nowrap"
          style={{ animationDuration: "22s" }}
        >
          {[0, 1].map((half) => (
            <div key={`comp-half-${half}`} className="flex items-center gap-6 sm:gap-8 pr-6 sm:pr-8 shrink-0">
              {companySet.map((item, idx) => (
                <div
                  key={`comp-${half}-${idx}`}
                  className="inline-flex items-center gap-3 px-3 py-1 text-sm transition-all duration-200"
                >
                  <span className="text-muted-foreground/60 text-sm" aria-hidden="true">✦</span>
                  <span
                    className={`font-black tracking-widest text-[13px] uppercase ${item.color} drop-shadow-sm`}
                  >
                    {item.text}
                  </span>
                  <span className="text-muted-foreground/30 text-sm">✦</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Concepts/Steps (Continuous Left-to-Right Motion) */}
      <div className="flex overflow-x-hidden">
        <div
          className="ticker-track-ltr flex items-center whitespace-nowrap"
          style={{ animationDuration: "34s" }}
        >
          {[0, 1].map((half) => (
            <div key={`concept-half-${half}`} className="flex items-center gap-4 pr-4 shrink-0">
              {conceptSet.map((item, idx) => (
                <div
                  key={`concept-${half}-${idx}`}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-[11px] font-mono transition-all duration-200 backdrop-blur-md shadow-xs ${item.color}`}
                >
                  <Terminal className="size-3 opacity-70" />
                  <span className="font-medium tracking-wide">{item.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
